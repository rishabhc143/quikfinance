import { createCrudItemHandlers } from "@/lib/api/crud";
import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { bankAccountRouteConfig } from "@/lib/api/module-routes";

export const dynamic = "force-dynamic";

const handlers = createCrudItemHandlers(bankAccountRouteConfig);

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const accountResult = await auth.context.supabase
    .from("bank_accounts")
    .select("id, account_id, name, institution_name, account_number_last4, currency, current_balance, is_active, created_at")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (accountResult.error || !accountResult.data) {
    return fail(404, { code: "NOT_FOUND", message: "Bank account was not found." });
  }

  const [paymentsResult, transactionsResult, reconciliationsResult] = await Promise.all([
    auth.context.supabase
      .from("payments")
      .select("id, payment_type, payment_date, amount, method, reference, status, memo")
      .eq("org_id", auth.context.orgId)
      .eq("deposit_account_id", accountResult.data.account_id)
      .order("payment_date", { ascending: false })
      .limit(8),
    auth.context.supabase
      .from("bank_transactions")
      .select("id, transaction_date, description, amount, reference, status")
      .eq("org_id", auth.context.orgId)
      .eq("bank_account_id", params.id)
      .order("transaction_date", { ascending: false })
      .limit(8),
    auth.context.supabase
      .from("reconciliations")
      .select("id, statement_start, statement_end, difference, status, created_at")
      .eq("org_id", auth.context.orgId)
      .eq("bank_account_id", params.id)
      .order("created_at", { ascending: false })
      .limit(6)
  ]);

  const payments = (paymentsResult.data ?? []).map((row) => ({
    id: String(row.id),
    payment_type: String(row.payment_type ?? ""),
    payment_date: String(row.payment_date),
    amount: Number(row.amount ?? 0),
    method: String(row.method ?? ""),
    reference: typeof row.reference === "string" ? row.reference : null,
    status: String(row.status ?? ""),
    memo: typeof row.memo === "string" ? row.memo : null
  }));

  const bankTransactions = (transactionsResult.data ?? []).map((row) => ({
    id: String(row.id),
    transaction_date: String(row.transaction_date),
    description: String(row.description ?? ""),
    amount: Number(row.amount ?? 0),
    reference: typeof row.reference === "string" ? row.reference : null,
    status: String(row.status ?? "")
  }));

  const reconciliations = (reconciliationsResult.data ?? []).map((row) => ({
    id: String(row.id),
    statement_start: String(row.statement_start),
    statement_end: String(row.statement_end),
    difference: Number(row.difference ?? 0),
    status: String(row.status ?? ""),
    created_at: String(row.created_at)
  }));

  return ok({
    ...accountResult.data,
    summary: {
      posted_receipts: payments.filter((row) => row.payment_type === "received" && row.status === "posted").length,
      posted_payouts: payments.filter((row) => row.payment_type === "made" && row.status === "posted").length,
      imported_statement_lines: bankTransactions.length,
      last_reconciled_at: reconciliations[0]?.created_at ?? null
    },
    payments,
    bank_transactions: bankTransactions,
    reconciliations
  });
}

export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
