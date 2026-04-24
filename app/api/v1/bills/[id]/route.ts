import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { computeDocumentTotals, postBillJournal } from "@/lib/accounting/transactions";
import { fail, ok } from "@/lib/api/responses";
import { billSchema } from "@/lib/validations/bill.schema";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

async function parseJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function audit(context: ApiContext, action: string, entityId: string, values: Json) {
  await context.supabase.from("audit_logs").insert({
    org_id: context.orgId,
    user_id: context.userId,
    entity_type: "bill",
    entity_id: entityId,
    action,
    new_values: values
  });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: bill, error } = await auth.context.supabase
    .from("bills")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (error || !bill) return fail(404, { code: "NOT_FOUND", message: "Bill not found." });

  const [{ data: vendor }, { data: lineItems }] = await Promise.all([
    auth.context.supabase.from("contacts").select("id, display_name, email").eq("org_id", auth.context.orgId).eq("id", bill.contact_id).maybeSingle(),
    auth.context.supabase.from("bill_lines").select("*").eq("org_id", auth.context.orgId).eq("bill_id", params.id).order("display_order", { ascending: true })
  ]);

  return ok({
    ...bill,
    vendor: vendor?.display_name ?? "Vendor",
    vendor_email: vendor?.email ?? null,
    line_items: lineItems ?? []
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("bills")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Bill not found." });
  if (existing.journal_entry_id) {
    return fail(409, { code: "POSTED_BILL_LOCKED", message: "Posted bills cannot be edited directly." });
  }

  const json = await parseJson(request);
  const merged = { ...existing, ...json };
  const parsed = billSchema.safeParse(merged);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The bill payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.issue_date, "purchases");
  if (lockResponse) return lockResponse;

  try {
    const { placeOfSupply, computation } = await computeDocumentTotals(auth.context, {
      contactId: parsed.data.contact_id,
      placeOfSupply: parsed.data.place_of_supply,
      subtotal: parsed.data.subtotal,
      taxTotal: parsed.data.tax_total,
      total: parsed.data.total,
      lineItems: parsed.data.line_items
    });

    const nextStatus = parsed.data.status === "draft"
      ? "draft"
      : computation.balance_due <= 0
        ? "paid"
        : computation.balance_due < computation.total
          ? "partial"
          : "approved";

    const { data: updated, error: updateError } = await auth.context.supabase
      .from("bills")
      .update({
        contact_id: parsed.data.contact_id,
        bill_number: parsed.data.bill_number ?? existing.bill_number,
        issue_date: parsed.data.issue_date,
        due_date: parsed.data.due_date,
        status: nextStatus,
        currency: parsed.data.currency,
        exchange_rate: parsed.data.exchange_rate,
        subtotal: computation.subtotal,
        discount_total: computation.discount_total,
        tax_total: computation.tax_total,
        total: computation.total,
        balance_due: computation.balance_due,
        notes: parsed.data.notes ?? null,
        place_of_supply: placeOfSupply,
        tds_amount: parsed.data.tds_amount
      })
      .eq("org_id", auth.context.orgId)
      .eq("id", params.id)
      .select("*")
      .single();

    if (updateError || !updated) return fail(400, { code: "UPDATE_FAILED", message: updateError?.message ?? "Bill could not be updated." });

    await auth.context.supabase.from("bill_lines").delete().eq("org_id", auth.context.orgId).eq("bill_id", params.id);
    if (computation.lines.length) {
      const rows = computation.lines.map((line, index) => ({
        org_id: auth.context.orgId,
        bill_id: params.id,
        item_id: line.item_id,
        account_id: line.account_id,
        description: line.description,
        quantity: line.quantity,
        rate: line.rate,
        discount: line.discount,
        tax_rate_id: line.tax_rate_id,
        tax_amount: line.tax_amount,
        line_total: line.line_total,
        display_order: index + 1
      }));
      const { error: lineError } = await auth.context.supabase.from("bill_lines").insert(rows);
      if (lineError) return fail(400, { code: "LINE_UPDATE_FAILED", message: lineError.message });
    }

    if (updated.status !== "draft") {
      await postBillJournal(auth.context, params.id);
    }

    await audit(auth.context, "update", params.id, json as Json);
    return ok(updated);
  } catch (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error instanceof Error ? error.message : "Bill could not be updated." });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("bills")
    .select("id, status, journal_entry_id, issue_date")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Bill not found." });
  if (existing.journal_entry_id || existing.status !== "draft") {
    return fail(409, { code: "DELETE_NOT_ALLOWED", message: "Only draft bills can be deleted." });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, String(existing.issue_date), "purchases");
  if (lockResponse) return lockResponse;

  const { error } = await auth.context.supabase.from("bills").delete().eq("org_id", auth.context.orgId).eq("id", params.id);
  if (error) return fail(400, { code: "DELETE_FAILED", message: error.message });

  await audit(auth.context, "delete", params.id, { id: params.id } as Json);
  return ok({ id: params.id });
}
