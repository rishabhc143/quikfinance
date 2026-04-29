import type { ApiContext } from "@/lib/api/auth";
import { loadCompanySetupSnapshot, type SetupChecklistItem } from "@/lib/company-setup";

export type DashboardData = {
  role: string;
  kpis: { label: string; value: number; change: string; tone: "good" | "warn" | "neutral"; kind?: "money" | "number"; href?: string }[];
  revenueExpense: { month: string; revenue: number; expenses: number }[];
  cashFlow: { date: string; cash: number }[];
  aging: { name: string; value: number }[];
  feed: { id: string; label: string; amount: number; date: string }[];
  commandCenter: {
    cards: { title: string; value: string; helper: string; href: string; status: string }[];
    alerts: { label: string; href: string; tone: "warning" | "success" | "info" }[];
    priorities: { title: string; description: string; href: string; tone: "warn" | "good" | "neutral" }[];
  };
  setup: { completed: boolean; progress_percent: number; checklist: SetupChecklistItem[] };
};

type InvoiceLite = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total: number;
  balance_due: number;
  tax_total: number;
  status: string;
};

type BillLite = {
  id: string;
  bill_number: string;
  issue_date: string;
  due_date: string;
  total: number;
  balance_due: number;
  tax_total: number;
  status: string;
};

type PaymentLite = {
  id: string;
  payment_type: "received" | "made";
  payment_date: string;
  amount: number;
  status: string;
  method: string;
};

type ExpenseLite = {
  id: string;
  expense_date: string;
  amount: number;
  tax_amount: number;
  description: string;
  status: string;
};

type BankAccountLite = {
  id: string;
  name: string;
  current_balance: number;
};

const today = new Date();

function isoMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "short" });
}

function buildRecentMonths(count = 6) {
  return Array.from({ length: count }).map((_, index) => {
    const value = new Date(today.getFullYear(), today.getMonth() - (count - index - 1), 1);
    return { key: isoMonth(value), label: monthLabel(value) };
  });
}

function sameMonth(dateValue: string, date: Date) {
  return dateValue.startsWith(isoMonth(date));
}

function daysOverdue(dateValue: string) {
  const due = new Date(dateValue);
  const diff = today.getTime() - due.getTime();
  return Math.max(Math.floor(diff / (1000 * 60 * 60 * 24)), 0);
}

function feedDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export const fallbackDashboard: DashboardData = {
  role: "owner",
  kpis: [
    { label: "Revenue MTD", value: 143800, change: "+18.4%", tone: "good", href: "/reports/profit-loss" },
    { label: "GST Payable", value: 24240, change: "Current month", tone: "warn", href: "/reports/gst-summary" },
    { label: "Outstanding Receivables", value: 24120, change: "9 invoices", tone: "warn", href: "/collections" },
    { label: "Outstanding Payables", value: 3280, change: "2 due this week", tone: "warn", href: "/payables" },
    { label: "Cash / Bank Balance", value: 102570, change: "+29.6k", tone: "good", href: "/bank-accounts" },
    { label: "Overdue Invoices", value: 3, change: "Needs follow-up", tone: "warn", kind: "number", href: "/collections" }
  ],
  revenueExpense: [
    { month: "Nov", revenue: 83000, expenses: 51200 },
    { month: "Dec", revenue: 91800, expenses: 53400 },
    { month: "Jan", revenue: 104200, expenses: 61200 },
    { month: "Feb", revenue: 112400, expenses: 65500 },
    { month: "Mar", revenue: 128600, expenses: 70200 },
    { month: "Apr", revenue: 143800, expenses: 96200 }
  ],
  cashFlow: [
    { date: "Jan", cash: 62400 },
    { date: "Feb", cash: 68800 },
    { date: "Mar", cash: 72970 },
    { date: "Apr", cash: 102570 }
  ],
  aging: [
    { name: "Current", value: 3200 },
    { name: "1-30", value: 232000 },
    { name: "31-60", value: 0 },
    { name: "90+", value: 0 }
  ],
  feed: [
    { id: "feed-1", label: "Payment received from Northstar Labs", amount: 4000, date: "Today" },
    { id: "feed-2", label: "Bill approved for Metro Cloud Hosting", amount: -1180, date: "Today" },
    { id: "feed-3", label: "Expense posted for client travel", amount: -640, date: "20 Apr" }
  ],
  commandCenter: {
    cards: [
      { title: "Open exceptions", value: "3", helper: "Resolve high-priority blockers first.", href: "/exception-queue", status: "Review" },
      { title: "Pending approvals", value: "6", helper: "Maker-checker queue across finance modules.", href: "/approvals", status: "Control" },
      { title: "Unmatched bank lines", value: "7", helper: "Statement lines still need matching.", href: "/bank-accounts", status: "Banking" },
      { title: "Copilot insights", value: "4 open", helper: "Investigate AI-suggested issues and opportunities.", href: "/finance-copilot", status: "AI" }
    ],
    alerts: [
      { label: "Resolve open GST and banking exceptions before close.", href: "/exception-queue", tone: "warning" },
      { label: "Dashboard fallback data is active because live data could not be loaded.", href: "/audit-trail", tone: "info" }
    ],
    priorities: [
      { title: "Review collections", description: "Follow up overdue invoices and share payment links.", href: "/collections", tone: "warn" },
      { title: "Review payables", description: "Check vendor dues and upcoming payouts.", href: "/payables", tone: "neutral" },
      { title: "Validate GST", description: "Open GST summary and parity before filing.", href: "/reports/gst-summary", tone: "neutral" }
    ]
  },
  setup: { completed: false, progress_percent: 0, checklist: [] }
};

export async function buildDashboardData(context: ApiContext): Promise<DashboardData> {
  const setupSnapshot = await loadCompanySetupSnapshot(context);
  const [{ data: invoices }, { data: bills }, { data: payments }, { data: expenses }, { data: bankAccounts }, { count: openExceptions }, { count: pendingApprovals }, { count: openInsights }, { count: unmatchedBankLines }] = await Promise.all([
    context.supabase
      .from("invoices")
      .select("id, invoice_number, issue_date, due_date, total, balance_due, tax_total, status")
      .eq("org_id", context.orgId),
    context.supabase
      .from("bills")
      .select("id, bill_number, issue_date, due_date, total, balance_due, tax_total, status")
      .eq("org_id", context.orgId),
    context.supabase
      .from("payments")
      .select("id, payment_type, payment_date, amount, status, method")
      .eq("org_id", context.orgId),
    context.supabase
      .from("expenses")
      .select("id, expense_date, amount, tax_amount, description, status")
      .eq("org_id", context.orgId),
    context.supabase
      .from("bank_accounts")
      .select("id, name, current_balance")
      .eq("org_id", context.orgId),
    context.supabase
      .from("workflow_exceptions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", context.orgId)
      .in("status", ["open", "in_progress"]),
    context.supabase
      .from("approval_requests")
      .select("id", { count: "exact", head: true })
      .eq("org_id", context.orgId)
      .eq("status", "pending"),
    context.supabase
      .from("finance_insights")
      .select("id", { count: "exact", head: true })
      .eq("org_id", context.orgId)
      .eq("status", "open"),
    context.supabase
      .from("bank_transactions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", context.orgId)
      .in("status", ["imported", "ignored"])
  ]);

  const invoiceRows = (invoices ?? []) as InvoiceLite[];
  const billRows = (bills ?? []) as BillLite[];
  const paymentRows = (payments ?? []) as PaymentLite[];
  const expenseRows = (expenses ?? []) as ExpenseLite[];
  const bankAccountRows = (bankAccounts ?? []) as BankAccountLite[];

  const activeInvoices = invoiceRows.filter((row) => row.status !== "void" && row.status !== "draft");
  const activeBills = billRows.filter((row) => row.status !== "void" && row.status !== "draft");
  const activeExpenses = expenseRows.filter((row) => row.status === "posted");
  const activePayments = paymentRows.filter((row) => row.status === "posted");
  const monthRows = buildRecentMonths(6);

  const revenueExpense = monthRows.map((month) => ({
    month: month.label,
    revenue: activeInvoices.filter((row) => row.issue_date.startsWith(month.key)).reduce((sum, row) => sum + Number(row.total ?? 0), 0),
    expenses:
      activeBills.filter((row) => row.issue_date.startsWith(month.key)).reduce((sum, row) => sum + Number(row.total ?? 0), 0) +
      activeExpenses.filter((row) => row.expense_date.startsWith(month.key)).reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
  }));

  const cashFlow = monthRows.map((month) => {
    const inflow = activePayments
      .filter((row) => row.payment_type === "received" && row.payment_date.startsWith(month.key))
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const outflow =
      activePayments
        .filter((row) => row.payment_type === "made" && row.payment_date.startsWith(month.key))
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0) +
      activeExpenses.filter((row) => row.expense_date.startsWith(month.key)).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    return {
      date: month.label,
      cash: inflow - outflow
    };
  });

  const overdueInvoices = activeInvoices.filter((row) => Number(row.balance_due ?? 0) > 0 && row.due_date < today.toISOString().slice(0, 10));
  const aging = [
    { name: "Current", value: activeInvoices.filter((row) => Number(row.balance_due ?? 0) > 0 && row.due_date >= today.toISOString().slice(0, 10)).reduce((sum, row) => sum + Number(row.balance_due ?? 0), 0) },
    { name: "1-30", value: overdueInvoices.filter((row) => daysOverdue(row.due_date) <= 30).reduce((sum, row) => sum + Number(row.balance_due ?? 0), 0) },
    { name: "31-60", value: overdueInvoices.filter((row) => daysOverdue(row.due_date) > 30 && daysOverdue(row.due_date) <= 60).reduce((sum, row) => sum + Number(row.balance_due ?? 0), 0) },
    { name: "90+", value: overdueInvoices.filter((row) => daysOverdue(row.due_date) > 60).reduce((sum, row) => sum + Number(row.balance_due ?? 0), 0) }
  ];

  const gstOutput = activeInvoices.filter((row) => sameMonth(row.issue_date, today)).reduce((sum, row) => sum + Number(row.tax_total ?? 0), 0);
  const gstInput =
    activeBills.filter((row) => sameMonth(row.issue_date, today)).reduce((sum, row) => sum + Number(row.tax_total ?? 0), 0) +
    activeExpenses.filter((row) => sameMonth(row.expense_date, today)).reduce((sum, row) => sum + Number(row.tax_amount ?? 0), 0);

  const feed = [
    ...activePayments.map((row) => ({
      id: `payment-${row.id}`,
      label: `${row.payment_type === "received" ? "Payment received" : "Vendor payment"} via ${row.method}`,
      amount: row.payment_type === "received" ? Number(row.amount ?? 0) : -Number(row.amount ?? 0),
      sortDate: row.payment_date,
      date: feedDate(row.payment_date)
    })),
    ...activeInvoices.map((row) => ({
      id: `invoice-${row.id}`,
      label: `Invoice ${row.invoice_number} ${row.status}`,
      amount: Number(row.total ?? 0),
      sortDate: row.issue_date,
      date: feedDate(row.issue_date)
    })),
    ...activeBills.map((row) => ({
      id: `bill-${row.id}`,
      label: `Bill ${row.bill_number} ${row.status}`,
      amount: -Number(row.total ?? 0),
      sortDate: row.issue_date,
      date: feedDate(row.issue_date)
    }))
  ]
    .sort((left, right) => right.sortDate.localeCompare(left.sortDate))
    .slice(0, 20)
    .map(({ sortDate: _sortDate, ...item }) => item);

  const currentMonthRevenue = activeInvoices.filter((row) => sameMonth(row.issue_date, today)).reduce((sum, row) => sum + Number(row.total ?? 0), 0);
  const receivables = activeInvoices.reduce((sum, row) => sum + Number(row.balance_due ?? 0), 0);
  const payables = activeBills.reduce((sum, row) => sum + Number(row.balance_due ?? 0), 0);
  const cashBalance = bankAccountRows.reduce((sum, row) => sum + Number(row.current_balance ?? 0), 0);

  return {
    role: context.role,
    kpis: [
      { label: "Revenue MTD", value: currentMonthRevenue, change: `${activeInvoices.filter((row) => sameMonth(row.issue_date, today)).length} invoices`, tone: currentMonthRevenue > 0 ? "good" : "neutral", href: "/reports/profit-loss" },
      { label: "GST Payable", value: gstOutput - gstInput, change: `Output ${gstOutput.toFixed(0)} / Input ${gstInput.toFixed(0)}`, tone: gstOutput - gstInput > 0 ? "warn" : "good", href: "/reports/gst-summary" },
      { label: "Outstanding Receivables", value: receivables, change: `${activeInvoices.filter((row) => Number(row.balance_due ?? 0) > 0).length} open`, tone: receivables > 0 ? "warn" : "good", href: "/collections" },
      { label: "Outstanding Payables", value: payables, change: `${activeBills.filter((row) => Number(row.balance_due ?? 0) > 0).length} open`, tone: payables > 0 ? "warn" : "good", href: "/payables" },
      { label: "Cash / Bank Balance", value: cashBalance, change: `${bankAccountRows.length} accounts`, tone: cashBalance >= 0 ? "good" : "warn", href: "/bank-accounts" },
      { label: "Overdue Invoices", value: overdueInvoices.length, change: "Requires follow-up", tone: overdueInvoices.length > 0 ? "warn" : "good", kind: "number", href: "/collections" }
    ],
    revenueExpense,
    cashFlow,
    aging,
    feed,
    commandCenter: {
      cards: [
        {
          title: "Open exceptions",
          value: String(openExceptions ?? 0),
          helper: "Compliance, banking, and workflow blockers requiring attention.",
          href: "/exception-queue",
          status: (openExceptions ?? 0) > 0 ? "Needs review" : "Clear"
        },
        {
          title: "Pending approvals",
          value: String(pendingApprovals ?? 0),
          helper: "Maker-checker tasks pending approval or rejection.",
          href: "/approvals",
          status: (pendingApprovals ?? 0) > 0 ? "Control" : "Clear"
        },
        {
          title: "Unmatched bank lines",
          value: String(unmatchedBankLines ?? 0),
          helper: "Statement lines still waiting for reconciliation.",
          href: "/bank-accounts",
          status: (unmatchedBankLines ?? 0) > 0 ? "Banking" : "Clear"
        },
        {
          title: "Copilot insights",
          value: `${openInsights ?? 0} open`,
          helper: "Data-driven insights surfaced for operator review.",
          href: "/finance-copilot",
          status: (openInsights ?? 0) > 0 ? "AI" : "Clear"
        }
      ],
      alerts: [
        ...(overdueInvoices.length > 0 ? [{ label: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"} need follow-up.`, href: "/collections", tone: "warning" as const }] : []),
        ...((openExceptions ?? 0) > 0 ? [{ label: `${openExceptions} open exception${openExceptions === 1 ? "" : "s"} are blocking smoother operations.`, href: "/exception-queue", tone: "warning" as const }] : []),
        ...((pendingApprovals ?? 0) > 0 ? [{ label: `${pendingApprovals} approval${pendingApprovals === 1 ? "" : "s"} pending maker-checker action.`, href: "/approvals", tone: "info" as const }] : []),
        ...((overdueInvoices.length === 0 && (openExceptions ?? 0) === 0) ? [{ label: "No urgent dashboard alerts right now.", href: "/dashboard", tone: "success" as const }] : [])
      ],
      priorities: [
        {
          title: "Review collections",
          description: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"} and ${receivables.toLocaleString("en-IN")} in receivables remain open.`,
          href: "/collections",
          tone: overdueInvoices.length > 0 ? "warn" : "neutral"
        },
        {
          title: "Review payables",
          description: `${activeBills.filter((row) => Number(row.balance_due ?? 0) > 0).length} open bill${activeBills.filter((row) => Number(row.balance_due ?? 0) > 0).length === 1 ? "" : "s"} require payment planning.`,
          href: "/payables",
          tone: payables > 0 ? "neutral" : "good"
        },
        {
          title: "Validate tax and filing readiness",
          description: `GST payable is ${(gstOutput - gstInput).toLocaleString("en-IN")} for the active month.`,
          href: "/reports/gst-summary",
          tone: gstOutput - gstInput > 0 ? "warn" : "neutral"
        }
      ]
    },
    setup: {
      completed: setupSnapshot.setup_completed,
      progress_percent: setupSnapshot.progress_percent,
      checklist: setupSnapshot.checklist
    }
  };
}
