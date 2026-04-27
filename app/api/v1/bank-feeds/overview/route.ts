import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const [{ data: bankAccounts, error: bankError }, { data: feeds, error: feedError }, { data: transactions, error: transactionError }] =
    await Promise.all([
      auth.context.supabase
        .from("bank_accounts")
        .select("id, name, institution_name, current_balance, is_active")
        .eq("org_id", auth.context.orgId)
        .order("name", { ascending: true }),
      auth.context.supabase
        .from("bank_feeds")
        .select("id, bank_account_id, feed_name, source_type, imported_on, statement_date, opening_balance, closing_balance, line_count, currency, status, notes, created_at")
        .eq("org_id", auth.context.orgId)
        .order("imported_on", { ascending: false })
        .limit(12),
      auth.context.supabase
        .from("bank_transactions")
        .select("id, bank_account_id, transaction_date, description, amount, reference, status, matched_journal_entry_id")
        .eq("org_id", auth.context.orgId)
        .order("transaction_date", { ascending: false })
        .limit(40)
    ]);

  if (bankError || feedError || transactionError) {
    return fail(500, {
      code: "BANK_FEEDS_OVERVIEW_FAILED",
      message: bankError?.message ?? feedError?.message ?? transactionError?.message ?? "Bank feed overview could not be loaded."
    });
  }

  const bankMap = new Map((bankAccounts ?? []).map((row) => [String(row.id), String(row.name ?? "Bank account")]));
  const recentExceptions = (transactions ?? [])
    .filter((row) => String(row.status) === "imported")
    .slice(0, 10)
    .map((row) => ({
      id: String(row.id),
      bank_account_id: String(row.bank_account_id),
      bank_account_name: bankMap.get(String(row.bank_account_id)) ?? "Bank account",
      transaction_date: String(row.transaction_date),
      description: String(row.description ?? "Imported transaction"),
      amount: Number(row.amount ?? 0),
      reference: typeof row.reference === "string" ? row.reference : null,
      status: String(row.status)
    }));

  return ok({
    summary: {
      active_bank_accounts: (bankAccounts ?? []).filter((row) => row.is_active !== false).length,
      pending_feeds: (feeds ?? []).filter((row) => String(row.status) !== "reconciled").length,
      unreconciled_lines: (transactions ?? []).filter((row) => String(row.status) === "imported").length,
      matched_lines: (transactions ?? []).filter((row) => ["matched", "reconciled"].includes(String(row.status))).length
    },
    bank_accounts: bankAccounts ?? [],
    feeds: (feeds ?? []).map((row) => ({
      ...row,
      bank_account_name: bankMap.get(String(row.bank_account_id ?? "")) ?? "Unmapped bank account"
    })),
    recent_exceptions: recentExceptions
  });
}
