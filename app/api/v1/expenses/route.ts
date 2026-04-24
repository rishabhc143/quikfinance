import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { createExpenseTransaction } from "@/lib/accounting/transactions";
import { fail, ok } from "@/lib/api/responses";
import { expenseSchema } from "@/lib/validations/operations.schema";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

function parsePaging(url: URL) {
  const page = Math.max(Number(url.searchParams.get("page") ?? "1"), 1);
  const perPage = Math.min(Math.max(Number(url.searchParams.get("per_page") ?? "25"), 1), 100);
  return { page, perPage, from: (page - 1) * perPage, to: page * perPage - 1 };
}

async function parseJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function loadAccountNames(context: ApiContext, accountIds: string[]) {
  if (!accountIds.length) return new Map<string, string>();
  const { data } = await context.supabase.from("accounts").select("id, name").eq("org_id", context.orgId).in("id", [...new Set(accountIds)]);
  return new Map((data ?? []).map((row) => [String(row.id), String(row.name ?? "Account")]));
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

export async function GET(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const url = new URL(request.url);
  const { page, perPage, from, to } = parsePaging(url);
  const search = url.searchParams.get("search");

  let query = auth.context.supabase
    .from("expenses")
    .select("id, expense_date, description, account_id, vendor_id, amount, tax_amount, status, currency, created_at, updated_at", { count: "exact" })
    .eq("org_id", auth.context.orgId);

  if (search) query = query.ilike("description", `%${search}%`);

  const { data, error, count } = await query.order("expense_date", { ascending: false }).range(from, to);
  if (error) return fail(400, { code: "LIST_FAILED", message: error.message });

  const accountMap = await loadAccountNames(auth.context, (data ?? []).map((row) => String(row.account_id)).filter(Boolean));
  const rows = (data ?? []).map((row) => ({ ...row, category: accountMap.get(String(row.account_id)) ?? "Expense" }));
  return ok(rows, { total: count ?? 0, page, per_page: perPage });
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const json = await parseJson(request);
  const parsed = expenseSchema.safeParse(json);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The expense payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.expense_date, "purchases");
  if (lockResponse) return lockResponse;

  try {
    const expense = await createExpenseTransaction(auth.context, parsed.data);
    await audit(auth.context, "create", String(expense.id), parsed.data as unknown as Json);
    return ok(expense, undefined, { status: 201 });
  } catch (error) {
    return fail(400, { code: "CREATE_FAILED", message: error instanceof Error ? error.message : "Expense could not be created." });
  }
}
