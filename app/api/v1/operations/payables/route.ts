import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const supabase = auth.context.supabase;
  const orgId = auth.context.orgId;
  const today = new Date().toISOString().slice(0, 10);

  const [
    outstandingBills,
    overdueBills,
    recentPayouts,
    pendingApprovals
  ] = await Promise.all([
    supabase
      .from("bills")
      .select("id, bill_number, issue_date, due_date, total, balance_due, status")
      .eq("org_id", orgId)
      .gt("balance_due", 0)
      .order("due_date", { ascending: true })
      .limit(12),
    supabase
      .from("bills")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gt("balance_due", 0)
      .lt("due_date", today),
    supabase
      .from("payments")
      .select("id, payment_date, amount, method, reference, status")
      .eq("org_id", orgId)
      .eq("payment_type", "made")
      .order("payment_date", { ascending: false })
      .limit(10),
    supabase
      .from("approval_requests")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "pending")
  ]);

  const errors = [outstandingBills.error, overdueBills.error, recentPayouts.error, pendingApprovals.error].filter(Boolean);
  if (errors.length > 0) {
    return fail(500, { code: "PAYABLES_OVERVIEW_FAILED", message: errors[0]?.message ?? "Payables overview could not be loaded." });
  }

  const bills = outstandingBills.data ?? [];
  const totalOutstanding = bills.reduce((sum, row) => sum + Number(row.balance_due ?? 0), 0);

  return ok({
    metrics: {
      total_outstanding: totalOutstanding,
      overdue_count: overdueBills.count ?? 0,
      pending_approvals: pendingApprovals.count ?? 0,
      bills_count: bills.length
    },
    bills,
    payouts: recentPayouts.data ?? []
  });
}
