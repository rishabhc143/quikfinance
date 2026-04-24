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
    outstandingInvoices,
    overdueInvoices,
    recentReceipts,
    paymentLinks
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, issue_date, due_date, total, balance_due, status")
      .eq("org_id", orgId)
      .gt("balance_due", 0)
      .order("due_date", { ascending: true })
      .limit(12),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gt("balance_due", 0)
      .lt("due_date", today),
    supabase
      .from("payments")
      .select("id, payment_date, amount, method, reference, status")
      .eq("org_id", orgId)
      .eq("payment_type", "received")
      .order("payment_date", { ascending: false })
      .limit(10),
    supabase
      .from("invoice_payment_links")
      .select("id, invoice_id, status, amount, amount_paid, short_url, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10)
  ]);

  const errors = [outstandingInvoices.error, overdueInvoices.error, recentReceipts.error, paymentLinks.error].filter(Boolean);
  if (errors.length > 0) {
    return fail(500, { code: "COLLECTIONS_OVERVIEW_FAILED", message: errors[0]?.message ?? "Collections overview could not be loaded." });
  }

  const invoices = outstandingInvoices.data ?? [];
  const totalOutstanding = invoices.reduce((sum, row) => sum + Number(row.balance_due ?? 0), 0);
  const dueThisWeek = invoices.filter((row) => {
    const due = String(row.due_date ?? "");
    if (!due) return false;
    const diff = (new Date(due).getTime() - new Date(today).getTime()) / 86400000;
    return diff >= 0 && diff <= 7
  });

  return ok({
    metrics: {
      total_outstanding: totalOutstanding,
      overdue_count: overdueInvoices.count ?? 0,
      due_this_week_count: dueThisWeek.length,
      open_payment_links: (paymentLinks.data ?? []).filter((row) => ["created", "issued", "partially_paid"].includes(String(row.status))).length
    },
    invoices,
    receipts: recentReceipts.data ?? [],
    payment_links: paymentLinks.data ?? []
  });
}
