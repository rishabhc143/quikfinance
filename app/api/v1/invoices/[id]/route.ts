import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { computeDocumentTotals, postInvoiceJournal } from "@/lib/accounting/transactions";
import { fail, ok } from "@/lib/api/responses";
import { invoiceSchema } from "@/lib/validations/invoice.schema";
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
    entity_type: "invoice",
    entity_id: entityId,
    action,
    new_values: values
  });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: invoice, error } = await auth.context.supabase
    .from("invoices")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (error || !invoice) return fail(404, { code: "NOT_FOUND", message: "Invoice not found." });

  const [{ data: customer }, { data: lineItems }] = await Promise.all([
    auth.context.supabase.from("contacts").select("id, display_name, email").eq("org_id", auth.context.orgId).eq("id", invoice.contact_id).maybeSingle(),
    auth.context.supabase.from("invoice_lines").select("*").eq("org_id", auth.context.orgId).eq("invoice_id", params.id).order("display_order", { ascending: true })
  ]);

  return ok({
    ...invoice,
    customer: customer?.display_name ?? "Customer",
    customer_email: customer?.email ?? null,
    line_items: lineItems ?? []
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("invoices")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Invoice not found." });
  if (existing.journal_entry_id) {
    return fail(409, { code: "POSTED_INVOICE_LOCKED", message: "Posted invoices cannot be edited directly." });
  }

  const json = await parseJson(request);
  const merged = { ...existing, ...json };
  const parsed = invoiceSchema.safeParse(merged);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The invoice payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.issue_date, "sales");
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
          : parsed.data.due_date < new Date().toISOString().slice(0, 10)
            ? "overdue"
            : "sent";

    const { data: updated, error: updateError } = await auth.context.supabase
      .from("invoices")
      .update({
        contact_id: parsed.data.contact_id,
        invoice_number: parsed.data.invoice_number ?? existing.invoice_number,
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
        round_off: parsed.data.round_off,
        terms: parsed.data.terms ?? null,
        template_type: parsed.data.template_type
      })
      .eq("org_id", auth.context.orgId)
      .eq("id", params.id)
      .select("*")
      .single();

    if (updateError || !updated) return fail(400, { code: "UPDATE_FAILED", message: updateError?.message ?? "Invoice could not be updated." });

    await auth.context.supabase.from("invoice_lines").delete().eq("org_id", auth.context.orgId).eq("invoice_id", params.id);
    if (computation.lines.length) {
      const rows = computation.lines.map((line, index) => ({
        org_id: auth.context.orgId,
        invoice_id: params.id,
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
      const { error: lineError } = await auth.context.supabase.from("invoice_lines").insert(rows);
      if (lineError) return fail(400, { code: "LINE_UPDATE_FAILED", message: lineError.message });
    }

    if (updated.status !== "draft") {
      await postInvoiceJournal(auth.context, params.id);
    }

    await audit(auth.context, "update", params.id, json as Json);
    return ok(updated);
  } catch (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error instanceof Error ? error.message : "Invoice could not be updated." });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("invoices")
    .select("id, status, journal_entry_id, issue_date")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Invoice not found." });
  if (existing.journal_entry_id || existing.status !== "draft") {
    return fail(409, { code: "DELETE_NOT_ALLOWED", message: "Only draft invoices can be deleted." });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, String(existing.issue_date), "sales");
  if (lockResponse) return lockResponse;

  const { error } = await auth.context.supabase.from("invoices").delete().eq("org_id", auth.context.orgId).eq("id", params.id);
  if (error) return fail(400, { code: "DELETE_FAILED", message: error.message });

  await audit(auth.context, "delete", params.id, { id: params.id } as Json);
  return ok({ id: params.id });
}
