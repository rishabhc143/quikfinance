import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { expenseSchema } from "@/lib/validations/operations.schema";
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
    entity_type: "expense",
    entity_id: entityId,
    action,
    new_values: values
  });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: expense, error } = await auth.context.supabase
    .from("expenses")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (error || !expense) return fail(404, { code: "NOT_FOUND", message: "Expense not found." });
  return ok(expense);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("expenses")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Expense not found." });
  if (existing.journal_entry_id || existing.status !== "draft") {
    return fail(409, { code: "EXPENSE_LOCKED", message: "Only draft expenses can be edited directly." });
  }

  const json = await parseJson(request);
  const parsed = expenseSchema.safeParse({ ...existing, ...json });
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The expense payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.expense_date, "purchases");
  if (lockResponse) return lockResponse;
  if (parsed.data.status !== "draft") {
    return fail(409, { code: "DRAFT_ONLY_EDIT", message: "Draft expenses can only be saved as draft. Create a posted expense to affect books." });
  }

  const { data: updated, error: updateError } = await auth.context.supabase
    .from("expenses")
    .update({
      expense_date: parsed.data.expense_date,
      vendor_id: parsed.data.vendor_id ?? null,
      account_id: parsed.data.account_id,
      payment_account_id: parsed.data.payment_account_id ?? null,
      project_id: parsed.data.project_id ?? null,
      amount: parsed.data.amount,
      tax_amount: parsed.data.tax_amount,
      currency: parsed.data.currency,
      receipt_url: parsed.data.receipt_url ?? null,
      is_billable: parsed.data.is_billable,
      description: parsed.data.description,
      status: parsed.data.status
    })
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .select("*")
    .single();

  if (updateError || !updated) return fail(400, { code: "UPDATE_FAILED", message: updateError?.message ?? "Expense could not be updated." });
  await audit(auth.context, "update", params.id, json as Json);
  return ok(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("expenses")
    .select("id, status, journal_entry_id, expense_date")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Expense not found." });
  if (existing.journal_entry_id || existing.status !== "draft") {
    return fail(409, { code: "DELETE_NOT_ALLOWED", message: "Only draft expenses can be deleted." });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, String(existing.expense_date), "purchases");
  if (lockResponse) return lockResponse;

  const { error } = await auth.context.supabase.from("expenses").delete().eq("org_id", auth.context.orgId).eq("id", params.id);
  if (error) return fail(400, { code: "DELETE_FAILED", message: error.message });

  await audit(auth.context, "delete", params.id, { id: params.id } as Json);
  return ok({ id: params.id });
}
