import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { paymentSchema } from "@/lib/validations/operations.schema";
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
    entity_type: "payment",
    entity_id: entityId,
    action,
    new_values: values
  });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: payment, error } = await auth.context.supabase
    .from("payments")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (error || !payment) return fail(404, { code: "NOT_FOUND", message: "Payment not found." });

  const [{ data: contact }, { data: allocations }] = await Promise.all([
    payment.contact_id
      ? auth.context.supabase.from("contacts").select("id, display_name, email").eq("org_id", auth.context.orgId).eq("id", payment.contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
    auth.context.supabase.from("payment_allocations").select("*").eq("org_id", auth.context.orgId).eq("payment_id", params.id)
  ]);

  return ok({
    ...payment,
    customer: payment.payment_type === "received" ? contact?.display_name ?? "Customer" : undefined,
    vendor: payment.payment_type === "made" ? contact?.display_name ?? "Vendor" : undefined,
    contact_name: contact?.display_name ?? null,
    allocations: allocations ?? []
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("payments")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Payment not found." });
  if (existing.journal_entry_id || existing.status !== "draft") {
    return fail(409, { code: "PAYMENT_LOCKED", message: "Only draft payments without posted journals can be edited." });
  }

  const json = await parseJson(request);
  const merged = { ...existing, ...json };
  const parsed = paymentSchema.safeParse(merged);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The payment payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.payment_date, "all");
  if (lockResponse) return lockResponse;
  if (parsed.data.status !== "draft") {
    return fail(409, { code: "DRAFT_ONLY_EDIT", message: "Draft payments can only be saved as draft. Create a new posted payment to affect books." });
  }

  const { data: updated, error: updateError } = await auth.context.supabase
    .from("payments")
    .update({
      contact_id: parsed.data.contact_id ?? null,
      payment_type: parsed.data.payment_type,
      payment_date: parsed.data.payment_date,
      amount: parsed.data.amount,
      unapplied_amount: parsed.data.amount,
      currency: parsed.data.currency,
      exchange_rate: parsed.data.exchange_rate,
      method: parsed.data.method,
      reference: parsed.data.reference ?? null,
      status: parsed.data.status,
      memo: parsed.data.memo ?? null
    })
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .select("*")
    .single();

  if (updateError || !updated) return fail(400, { code: "UPDATE_FAILED", message: updateError?.message ?? "Payment could not be updated." });

  await audit(auth.context, "update", params.id, json as Json);
  return ok(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("payments")
    .select("id, status, journal_entry_id, payment_date")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Payment not found." });
  if (existing.journal_entry_id || existing.status !== "draft") {
    return fail(409, { code: "DELETE_NOT_ALLOWED", message: "Only draft payments can be deleted." });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, String(existing.payment_date), "all");
  if (lockResponse) return lockResponse;

  const { error } = await auth.context.supabase.from("payments").delete().eq("org_id", auth.context.orgId).eq("id", params.id);
  if (error) return fail(400, { code: "DELETE_FAILED", message: error.message });

  await audit(auth.context, "delete", params.id, { id: params.id } as Json);
  return ok({ id: params.id });
}
