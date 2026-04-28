export type ReportCatalogEntry = {
  key: string;
  group: "Financial Statements" | "Working Capital" | "GST & Compliance";
  audience: string;
  cadence: string;
  actions: Array<{ label: string; href: string }>;
};

export const reportCatalog: ReportCatalogEntry[] = [
  {
    key: "profit-loss",
    group: "Financial Statements",
    audience: "Founders, accountants, and monthly finance reviews",
    cadence: "Review monthly",
    actions: [
      { label: "Invoices", href: "/invoices" },
      { label: "Expenses", href: "/expenses" }
    ]
  },
  {
    key: "balance-sheet",
    group: "Financial Statements",
    audience: "Founders, accountants, and statutory review",
    cadence: "Review monthly",
    actions: [
      { label: "Chart of Accounts", href: "/chart-of-accounts" },
      { label: "Bank Accounts", href: "/bank-accounts" }
    ]
  },
  {
    key: "trial-balance",
    group: "Financial Statements",
    audience: "Accounting controls and month-end review",
    cadence: "Review before close",
    actions: [
      { label: "Journal Entries", href: "/journal-entries" },
      { label: "Ledgers", href: "/ledgers" }
    ]
  },
  {
    key: "cash-flow",
    group: "Financial Statements",
    audience: "Cash planning and liquidity review",
    cadence: "Review weekly",
    actions: [
      { label: "Payments", href: "/payments" },
      { label: "Bank Accounts", href: "/bank-accounts" }
    ]
  },
  {
    key: "aging",
    group: "Working Capital",
    audience: "Collections and payables follow-up",
    cadence: "Review weekly",
    actions: [
      { label: "Collections", href: "/collections" },
      { label: "Payables", href: "/payables" }
    ]
  },
  {
    key: "outstanding",
    group: "Working Capital",
    audience: "Daily receivable and payable follow-up",
    cadence: "Review daily",
    actions: [
      { label: "Invoices", href: "/invoices" },
      { label: "Bills", href: "/bills" }
    ]
  },
  {
    key: "gst-summary",
    group: "GST & Compliance",
    audience: "Tax review before filing",
    cadence: "Review monthly",
    actions: [
      { label: "GST Parity", href: "/reports/gst-parity" },
      { label: "E-Invoicing", href: "/e-invoicing" }
    ]
  },
  {
    key: "gst-parity",
    group: "GST & Compliance",
    audience: "GST exception review",
    cadence: "Review weekly",
    actions: [
      { label: "Exception Queue", href: "/exception-queue" },
      { label: "GST Summary", href: "/reports/gst-summary" }
    ]
  },
  {
    key: "gstr-1",
    group: "GST & Compliance",
    audience: "Outward filing preparation",
    cadence: "Review monthly",
    actions: [
      { label: "Invoices", href: "/invoices" },
      { label: "E-Invoicing", href: "/e-invoicing" }
    ]
  },
  {
    key: "gstr-3b",
    group: "GST & Compliance",
    audience: "Tax return review and filing prep",
    cadence: "Review monthly",
    actions: [
      { label: "GST Summary", href: "/reports/gst-summary" },
      { label: "TDS / TCS", href: "/tds-tcs" }
    ]
  }
];

export const reportGroups = ["Financial Statements", "Working Capital", "GST & Compliance"] as const;

export function getReportCatalogEntry(key: string) {
  return reportCatalog.find((entry) => entry.key === key);
}
