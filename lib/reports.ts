import type { TableRow } from "@/lib/modules";

export type ReportConfig = {
  key: string;
  title: string;
  description: string;
  apiPath: string;
  columns: { key: string; label: string; kind?: "text" | "money" | "number" }[];
  rows: TableRow[];
  summary: { label: string; value: number; tone: "good" | "warn" | "neutral" }[];
};

export const reportConfigs: Record<string, ReportConfig> = {
  "profit-loss": {
    key: "profit-loss",
    title: "Profit & Loss",
    description: "Revenue, cost of goods sold, expenses, and net income for the selected period.",
    apiPath: "/api/v1/reports/profit-loss",
    columns: [
      { key: "account", label: "Account" },
      { key: "current", label: "Current", kind: "money" },
      { key: "comparison", label: "Comparison", kind: "money" },
      { key: "variance", label: "Variance", kind: "money" }
    ],
    rows: [
      { id: "pl-1", account: "Consulting Revenue", current: 143800, comparison: 118400, variance: 25400 },
      { id: "pl-2", account: "Cost of Goods Sold", current: 38400, comparison: 31200, variance: 7200 },
      { id: "pl-3", account: "Operating Expenses", current: 57800, comparison: 52600, variance: 5200 }
    ],
    summary: [
      { label: "Revenue", value: 143800, tone: "good" },
      { label: "Net income", value: 47600, tone: "good" },
      { label: "Margin", value: 33.1, tone: "neutral" }
    ]
  },
  "balance-sheet": {
    key: "balance-sheet",
    title: "Balance Sheet",
    description: "Assets, liabilities, and equity as of the selected date.",
    apiPath: "/api/v1/reports/balance-sheet",
    columns: [
      { key: "section", label: "Section" },
      { key: "account", label: "Account" },
      { key: "amount", label: "Amount", kind: "money" }
    ],
    rows: [
      { id: "bs-1", section: "Assets", account: "Cash and Bank", amount: 102570 },
      { id: "bs-2", section: "Assets", account: "Accounts Receivable", amount: 24120 },
      { id: "bs-3", section: "Liabilities", account: "Accounts Payable", amount: 3280 },
      { id: "bs-4", section: "Equity", account: "Retained Earnings", amount: 123410 }
    ],
    summary: [
      { label: "Assets", value: 126690, tone: "neutral" },
      { label: "Liabilities", value: 3280, tone: "warn" },
      { label: "Equity", value: 123410, tone: "good" }
    ]
  },
  "trial-balance": {
    key: "trial-balance",
    title: "Trial Balance",
    description: "Debit and credit totals by account, balanced for the selected period.",
    apiPath: "/api/v1/reports/trial-balance",
    columns: [
      { key: "account", label: "Account" },
      { key: "debit", label: "Debit", kind: "money" },
      { key: "credit", label: "Credit", kind: "money" }
    ],
    rows: [
      { id: "tb-1", account: "Cash and Bank", debit: 102570, credit: 0 },
      { id: "tb-2", account: "Revenue", debit: 0, credit: 143800 },
      { id: "tb-3", account: "Expenses", debit: 57800, credit: 0 }
    ],
    summary: [
      { label: "Debits", value: 160370, tone: "neutral" },
      { label: "Credits", value: 160370, tone: "neutral" },
      { label: "Difference", value: 0, tone: "good" }
    ]
  },
  "cash-flow": {
    key: "cash-flow",
    title: "Cash Flow",
    description: "Operating, investing, and financing movements over the selected period.",
    apiPath: "/api/v1/reports/cash-flow",
    columns: [
      { key: "activity", label: "Activity" },
      { key: "amount", label: "Amount", kind: "money" }
    ],
    rows: [
      { id: "cf-1", activity: "Operating cash flow", amount: 38200 },
      { id: "cf-2", activity: "Investing cash flow", amount: -8600 },
      { id: "cf-3", activity: "Financing cash flow", amount: 0 }
    ],
    summary: [
      { label: "Net cash flow", value: 29600, tone: "good" },
      { label: "Opening cash", value: 72970, tone: "neutral" },
      { label: "Closing cash", value: 102570, tone: "good" }
    ]
  },
  aging: {
    key: "aging",
    title: "Aging",
    description: "Receivables and payables grouped by overdue bucket.",
    apiPath: "/api/v1/reports/aging",
    columns: [
      { key: "contact", label: "Contact" },
      { key: "current", label: "Current", kind: "money" },
      { key: "days_30", label: "1-30", kind: "money" },
      { key: "days_60", label: "31-60", kind: "money" },
      { key: "days_90", label: "90+", kind: "money" }
    ],
    rows: [
      { id: "age-1", contact: "Northstar Labs", current: 3200, days_30: 0, days_60: 0, days_90: 0 },
      { id: "age-2", contact: "Aarav Textiles", current: 0, days_30: 232000, days_60: 0, days_90: 0 }
    ],
    summary: [
      { label: "Current", value: 3200, tone: "neutral" },
      { label: "Overdue", value: 232000, tone: "warn" },
      { label: "Collection risk", value: 21.4, tone: "warn" }
    ]
  }
};

export function getReportConfig(key: string) {
  const config = reportConfigs[key];
  if (!config) {
    throw new Error(`Unknown report: ${key}`);
  }
  return config;
}
