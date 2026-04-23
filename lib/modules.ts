import {
  Activity,
  Banknote,
  BarChart3,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  Cable,
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileText,
  Landmark,
  MessageCircle,
  Package,
  Receipt,
  Repeat2,
  ScanText,
  Settings,
  ShieldCheck,
  Tags,
  Upload,
  Users,
  Webhook,
  WalletCards
} from "lucide-react";
import { addDaysISO, todayISO } from "@/lib/utils/dates";

export type TableValue = string | number | boolean | null;
export type TableRow = { id: string } & Record<string, TableValue>;

export type DataColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  kind?: "text" | "money" | "date" | "status" | "number" | "boolean";
};

export type FieldType = "text" | "email" | "number" | "date" | "money" | "select" | "textarea" | "checkbox";

export type FormField = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
};

export type ModuleConfig = {
  key: string;
  title: string;
  entityName: string;
  description: string;
  apiPath: string;
  newPath?: string;
  columns: DataColumn[];
  rows: TableRow[];
  formFields: FormField[];
  primaryAction?: string;
};

export type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const navigationGroups: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [{ title: "Dashboard", href: "/", icon: Activity }] },
  {
    label: "Sales",
    items: [
      { title: "Customers", href: "/customers", icon: Users },
      { title: "Quotations", href: "/quotations", icon: FileText },
      { title: "Sales Orders", href: "/sales-orders", icon: ClipboardList },
      { title: "Invoices", href: "/invoices", icon: FileText },
      { title: "Credit Notes", href: "/credit-notes", icon: Repeat2 },
      { title: "Payments Received", href: "/payments/received", icon: CircleDollarSign }
    ]
  },
  {
    label: "Purchases",
    items: [
      { title: "Vendors", href: "/vendors", icon: Building2 },
      { title: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
      { title: "Bills", href: "/bills", icon: ClipboardList },
      { title: "Vendor Credits", href: "/vendor-credits", icon: Repeat2 },
      { title: "Expenses", href: "/expenses", icon: Receipt },
      { title: "Payments Made", href: "/payments/made", icon: CreditCard }
    ]
  },
  {
    label: "Accounting",
    items: [
      { title: "Chart of Accounts", href: "/chart-of-accounts", icon: BookOpen },
      { title: "Journal Entries", href: "/journal-entries", icon: Calculator },
      { title: "Bank Accounts", href: "/bank-accounts", icon: Landmark }
    ]
  },
  {
    label: "Reports",
    items: [
      { title: "Reports", href: "/reports", icon: FileBarChart },
      { title: "Trial Balance", href: "/reports/trial-balance", icon: BookOpen },
      { title: "P&L", href: "/reports/profit-loss", icon: BarChart3 },
      { title: "Balance Sheet", href: "/reports/balance-sheet", icon: ChartNoAxesCombined },
      { title: "Aging", href: "/reports/aging", icon: Repeat2 },
      { title: "GSTR-1", href: "/reports/gstr-1", icon: Receipt },
      { title: "GSTR-3B", href: "/reports/gstr-3b", icon: Tags },
      { title: "GST Summary", href: "/reports/gst-summary", icon: Receipt },
      { title: "GST Parity", href: "/reports/gst-parity", icon: Tags },
      { title: "Outstanding", href: "/reports/outstanding", icon: ClipboardList }
    ]
  },
  {
    label: "More",
    items: [
      { title: "Fixed Assets", href: "/fixed-assets", icon: Briefcase },
      { title: "Inventory", href: "/inventory", icon: Package },
      { title: "Projects", href: "/projects", icon: Boxes },
      { title: "Time Tracking", href: "/time-tracking", icon: Activity },
      { title: "Budgets", href: "/budgets", icon: WalletCards }
    ]
  },
  {
    label: "Automation",
    items: [
      { title: "Imports", href: "/imports", icon: Upload },
      { title: "Chatbot", href: "/chatbot", icon: MessageCircle },
      { title: "OCR Bills", href: "/ocr-bills", icon: ScanText },
      { title: "Period Locks", href: "/period-locks", icon: ShieldCheck },
      { title: "Integrations", href: "/integrations", icon: Cable }
    ]
  },
  {
    label: "Settings",
    items: [
      { title: "Company", href: "/settings", icon: Settings },
      { title: "Taxes", href: "/settings/taxes", icon: Tags },
      { title: "Currencies", href: "/settings/currencies", icon: Banknote },
      { title: "Portals", href: "/settings/portals", icon: Webhook }
    ]
  }
];

const money = (value: number) => value;
const today = todayISO();
const dueSoon = addDaysISO(10);

const contactFields: FormField[] = [
  { name: "display_name", label: "Display name", type: "text", required: true },
  { name: "company_name", label: "Company", type: "text" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone", type: "text" },
  { name: "tax_id", label: "GSTIN", type: "text" },
  { name: "pan", label: "PAN", type: "text" },
  { name: "state_code", label: "State code", type: "text" },
  { name: "currency", label: "Currency", type: "select", options: [{ label: "INR", value: "INR" }, { label: "USD", value: "USD" }, { label: "EUR", value: "EUR" }] },
  { name: "payment_terms", label: "Payment terms", type: "number" },
  { name: "opening_balance", label: "Opening balance", type: "money" },
  { name: "notes", label: "Notes", type: "textarea" }
];

const documentFields: FormField[] = [
  { name: "contact_id", label: "Contact ID", type: "text", required: true },
  { name: "issue_date", label: "Issue date", type: "date", required: true },
  { name: "due_date", label: "Due date", type: "date", required: true },
  { name: "subtotal", label: "Subtotal", type: "money", required: true },
  { name: "tax_total", label: "Tax", type: "money" },
  { name: "discount_total", label: "Discount", type: "money" },
  { name: "place_of_supply", label: "Place of supply", type: "text" },
  { name: "total", label: "Total", type: "money", required: true },
  { name: "notes", label: "Notes", type: "textarea" }
];

const invoiceDocumentFields: FormField[] = [...documentFields, { name: "round_off", label: "Round off", type: "money" }];

export const moduleConfigs: Record<string, ModuleConfig> = {
  customers: {
    key: "customers",
    title: "Customers",
    entityName: "customer",
    description: "Manage receivables contacts, statements, limits, and payment terms.",
    apiPath: "/api/v1/customers",
    newPath: "/customers/new",
    primaryAction: "New customer",
    columns: [
      { key: "display_name", label: "Customer" },
      { key: "email", label: "Email" },
      { key: "currency", label: "Currency", align: "center" },
      { key: "outstanding", label: "Outstanding", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "cust-1", display_name: "Northstar Labs", email: "ap@northstar.example", currency: "USD", outstanding: money(12840), status: "active" },
      { id: "cust-2", display_name: "Greenline Foods", email: "finance@greenline.example", currency: "USD", outstanding: money(6420), status: "active" },
      { id: "cust-3", display_name: "Aarav Textiles", email: "accounts@aarav.example", currency: "INR", outstanding: money(232000), status: "active" }
    ],
    formFields: contactFields
  },
  vendors: {
    key: "vendors",
    title: "Vendors",
    entityName: "vendor",
    description: "Track supplier terms, bills, tax registrations, and payables.",
    apiPath: "/api/v1/vendors",
    newPath: "/vendors/new",
    primaryAction: "New vendor",
    columns: [
      { key: "display_name", label: "Vendor" },
      { key: "email", label: "Email" },
      { key: "currency", label: "Currency", align: "center" },
      { key: "balance", label: "Balance", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "ven-1", display_name: "LedgerWorks Advisory", email: "billing@ledgerworks.example", currency: "USD", balance: money(4200), status: "active" },
      { id: "ven-2", display_name: "Metro Cloud Hosting", email: "billing@metrocloud.example", currency: "USD", balance: money(1180), status: "active" }
    ],
    formFields: contactFields
  },
  invoices: {
    key: "invoices",
    title: "Invoices",
    entityName: "invoice",
    description: "Create, send, duplicate, collect, and age customer invoices.",
    apiPath: "/api/v1/invoices",
    newPath: "/invoices/new",
    primaryAction: "New invoice",
    columns: [
      { key: "invoice_number", label: "Invoice" },
      { key: "customer", label: "Customer" },
      { key: "due_date", label: "Due date", kind: "date" },
      { key: "total", label: "Total", kind: "money", align: "right" },
      { key: "balance_due", label: "Balance", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "inv-1", invoice_number: "INV-0001", customer: "Northstar Labs", due_date: dueSoon, total: money(7200), balance_due: money(3200), status: "partial" },
      { id: "inv-2", invoice_number: "INV-0002", customer: "Greenline Foods", due_date: today, total: money(6420), balance_due: money(6420), status: "sent" },
      { id: "inv-3", invoice_number: "INV-0003", customer: "Aarav Textiles", due_date: "2026-04-01", total: money(232000), balance_due: money(232000), status: "overdue" }
    ],
    formFields: invoiceDocumentFields
  },
  quotations: {
    key: "quotations",
    title: "Quotations",
    entityName: "quotation",
    description: "Prepare estimates, expiry-based proposals, and convert-ready sales quotes.",
    apiPath: "/api/v1/quotations",
    newPath: "/quotations/new",
    primaryAction: "New quotation",
    columns: [
      { key: "quotation_number", label: "Quotation" },
      { key: "contact_id", label: "Customer" },
      { key: "issue_date", label: "Date", kind: "date" },
      { key: "due_date", label: "Expiry", kind: "date" },
      { key: "total", label: "Total", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [{ id: "qt-1", quotation_number: "QT-0001", contact_id: "cust-1", issue_date: today, due_date: dueSoon, total: money(48000), status: "sent" }],
    formFields: [
      { name: "contact_id", label: "Customer ID", type: "text", required: true },
      { name: "issue_date", label: "Quotation date", type: "date", required: true },
      { name: "due_date", label: "Expiry date", type: "date", required: true },
      { name: "subtotal", label: "Subtotal", type: "money", required: true },
      { name: "tax_total", label: "Tax", type: "money" },
      { name: "total", label: "Total", type: "money", required: true },
      { name: "status", label: "Status", type: "select", options: [{ label: "Draft", value: "draft" }, { label: "Sent", value: "sent" }, { label: "Accepted", value: "accepted" }] },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  "sales-orders": {
    key: "sales-orders",
    title: "Sales Orders",
    entityName: "sales order",
    description: "Track committed sales, fulfillment staging, and order conversion into invoices.",
    apiPath: "/api/v1/sales-orders",
    newPath: "/sales-orders/new",
    primaryAction: "New sales order",
    columns: [
      { key: "sales_order_number", label: "Order" },
      { key: "contact_id", label: "Customer" },
      { key: "issue_date", label: "Date", kind: "date" },
      { key: "due_date", label: "Expected", kind: "date" },
      { key: "total", label: "Total", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [{ id: "so-1", sales_order_number: "SO-0001", contact_id: "cust-2", issue_date: today, due_date: dueSoon, total: money(64200), status: "confirmed" }],
    formFields: [
      { name: "contact_id", label: "Customer ID", type: "text", required: true },
      { name: "issue_date", label: "Order date", type: "date", required: true },
      { name: "due_date", label: "Expected delivery", type: "date", required: true },
      { name: "subtotal", label: "Subtotal", type: "money", required: true },
      { name: "tax_total", label: "Tax", type: "money" },
      { name: "total", label: "Total", type: "money", required: true },
      { name: "status", label: "Status", type: "select", options: [{ label: "Draft", value: "draft" }, { label: "Confirmed", value: "confirmed" }, { label: "Fulfilled", value: "fulfilled" }] },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  bills: {
    key: "bills",
    title: "Bills",
    entityName: "bill",
    description: "Approve vendor bills, schedule payments, and keep AP aging current.",
    apiPath: "/api/v1/bills",
    newPath: "/bills/new",
    primaryAction: "New bill",
    columns: [
      { key: "bill_number", label: "Bill" },
      { key: "vendor", label: "Vendor" },
      { key: "due_date", label: "Due date", kind: "date" },
      { key: "total", label: "Total", kind: "money", align: "right" },
      { key: "balance_due", label: "Balance", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "bill-1", bill_number: "BILL-0001", vendor: "Metro Cloud Hosting", due_date: dueSoon, total: money(1180), balance_due: money(1180), status: "approved" },
      { id: "bill-2", bill_number: "BILL-0002", vendor: "LedgerWorks Advisory", due_date: today, total: money(4200), balance_due: money(2100), status: "partial" }
    ],
    formFields: documentFields
  },
  "purchase-orders": {
    key: "purchase-orders",
    title: "Purchase Orders",
    entityName: "purchase order",
    description: "Control vendor commitments, approvals, and expected receipt schedules.",
    apiPath: "/api/v1/purchase-orders",
    newPath: "/purchase-orders/new",
    primaryAction: "New purchase order",
    columns: [
      { key: "purchase_order_number", label: "PO" },
      { key: "contact_id", label: "Vendor" },
      { key: "issue_date", label: "Date", kind: "date" },
      { key: "due_date", label: "Expected", kind: "date" },
      { key: "total", label: "Total", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [{ id: "po-1", purchase_order_number: "PO-0001", contact_id: "ven-1", issue_date: today, due_date: dueSoon, total: money(18500), status: "approved" }],
    formFields: [
      { name: "contact_id", label: "Vendor ID", type: "text", required: true },
      { name: "issue_date", label: "PO date", type: "date", required: true },
      { name: "due_date", label: "Expected date", type: "date", required: true },
      { name: "subtotal", label: "Subtotal", type: "money", required: true },
      { name: "tax_total", label: "Tax", type: "money" },
      { name: "total", label: "Total", type: "money", required: true },
      { name: "status", label: "Status", type: "select", options: [{ label: "Draft", value: "draft" }, { label: "Approved", value: "approved" }, { label: "Received", value: "received" }] },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  "credit-notes": {
    key: "credit-notes",
    title: "Credit Notes",
    entityName: "credit note",
    description: "Issue sales returns, reference original invoices, and reduce customer outstanding cleanly.",
    apiPath: "/api/v1/credit-notes",
    newPath: "/credit-notes/new",
    primaryAction: "New credit note",
    columns: [
      { key: "credit_note_number", label: "Credit note" },
      { key: "contact_id", label: "Customer" },
      { key: "issue_date", label: "Date", kind: "date" },
      { key: "total", label: "Amount", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [{ id: "cn-1", credit_note_number: "CN-0001", contact_id: "cust-3", issue_date: today, total: money(5200), status: "issued" }],
    formFields: [
      { name: "contact_id", label: "Customer ID", type: "text", required: true },
      { name: "invoice_id", label: "Original invoice ID", type: "text" },
      { name: "issue_date", label: "Date", type: "date", required: true },
      { name: "due_date", label: "Applies by", type: "date", required: true },
      { name: "subtotal", label: "Subtotal", type: "money", required: true },
      { name: "tax_total", label: "Tax", type: "money" },
      { name: "total", label: "Total", type: "money", required: true },
      { name: "status", label: "Status", type: "select", options: [{ label: "Draft", value: "draft" }, { label: "Issued", value: "issued" }, { label: "Applied", value: "applied" }] },
      { name: "notes", label: "Reason", type: "textarea" }
    ]
  },
  "vendor-credits": {
    key: "vendor-credits",
    title: "Vendor Credits",
    entityName: "vendor credit",
    description: "Capture supplier debit note equivalents and reduce AP balances after returns or disputes.",
    apiPath: "/api/v1/vendor-credits",
    newPath: "/vendor-credits/new",
    primaryAction: "New vendor credit",
    columns: [
      { key: "vendor_credit_number", label: "Vendor credit" },
      { key: "contact_id", label: "Vendor" },
      { key: "issue_date", label: "Date", kind: "date" },
      { key: "total", label: "Amount", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [{ id: "vc-1", vendor_credit_number: "VC-0001", contact_id: "ven-2", issue_date: today, total: money(2400), status: "received" }],
    formFields: [
      { name: "contact_id", label: "Vendor ID", type: "text", required: true },
      { name: "bill_id", label: "Related bill ID", type: "text" },
      { name: "issue_date", label: "Date", type: "date", required: true },
      { name: "due_date", label: "Applies by", type: "date", required: true },
      { name: "subtotal", label: "Subtotal", type: "money", required: true },
      { name: "tax_total", label: "Tax", type: "money" },
      { name: "total", label: "Total", type: "money", required: true },
      { name: "status", label: "Status", type: "select", options: [{ label: "Draft", value: "draft" }, { label: "Received", value: "received" }, { label: "Applied", value: "applied" }] },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  "payments-received": {
    key: "payments-received",
    title: "Payments Received",
    entityName: "payment",
    description: "Allocate receipts against invoices or keep advances unapplied.",
    apiPath: "/api/v1/payments?type=received",
    columns: [
      { key: "payment_date", label: "Date", kind: "date" },
      { key: "customer", label: "Customer" },
      { key: "method", label: "Method" },
      { key: "amount", label: "Amount", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "pay-1", payment_date: today, customer: "Northstar Labs", method: "ACH", amount: money(4000), status: "posted" },
      { id: "pay-2", payment_date: "2026-04-18", customer: "Greenline Foods", method: "Card", amount: money(1200), status: "posted" }
    ],
    formFields: []
  },
  "payments-made": {
    key: "payments-made",
    title: "Payments Made",
    entityName: "payment",
    description: "Record vendor payments and reconcile them to bank activity.",
    apiPath: "/api/v1/payments?type=made",
    columns: [
      { key: "payment_date", label: "Date", kind: "date" },
      { key: "vendor", label: "Vendor" },
      { key: "method", label: "Method" },
      { key: "amount", label: "Amount", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "paym-1", payment_date: "2026-04-17", vendor: "LedgerWorks Advisory", method: "Bank transfer", amount: money(2100), status: "posted" }
    ],
    formFields: []
  },
  expenses: {
    key: "expenses",
    title: "Expenses",
    entityName: "expense",
    description: "Capture receipts, tax, billable flags, and automatic journal entries.",
    apiPath: "/api/v1/expenses",
    newPath: "/expenses/new",
    primaryAction: "Add expense",
    columns: [
      { key: "expense_date", label: "Date", kind: "date" },
      { key: "description", label: "Description" },
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "exp-1", expense_date: today, description: "Client travel", category: "Travel", amount: money(640), status: "posted" },
      { id: "exp-2", expense_date: "2026-04-16", description: "Design software", category: "Subscriptions", amount: money(89), status: "posted" }
    ],
    formFields: [
      { name: "expense_date", label: "Date", type: "date", required: true },
      { name: "description", label: "Description", type: "text", required: true },
      { name: "account_id", label: "Expense account ID", type: "text", required: true },
      { name: "amount", label: "Amount", type: "money", required: true },
      { name: "tax_amount", label: "Tax", type: "money" },
      { name: "is_billable", label: "Billable", type: "checkbox" }
    ]
  },
  "journal-entries": {
    key: "journal-entries",
    title: "Journal Entries",
    entityName: "journal entry",
    description: "Post balanced manual entries with approval and audit history.",
    apiPath: "/api/v1/journal-entries",
    newPath: "/journal-entries/new",
    primaryAction: "New entry",
    columns: [
      { key: "entry_number", label: "Entry" },
      { key: "entry_date", label: "Date", kind: "date" },
      { key: "memo", label: "Memo" },
      { key: "debits", label: "Debits", kind: "money", align: "right" },
      { key: "credits", label: "Credits", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "je-1", entry_number: "JE-0001", entry_date: today, memo: "Monthly payroll accrual", debits: money(9500), credits: money(9500), status: "posted" }
    ],
    formFields: [
      { name: "entry_date", label: "Entry date", type: "date", required: true },
      { name: "memo", label: "Memo", type: "textarea" },
      { name: "status", label: "Status", type: "select", options: [{ label: "Draft", value: "draft" }, { label: "Posted", value: "posted" }] }
    ]
  },
  "chart-of-accounts": {
    key: "chart-of-accounts",
    title: "Chart of Accounts",
    entityName: "account",
    description: "Maintain the account tree, account types, and running balances.",
    apiPath: "/api/v1/accounts",
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Account" },
      { key: "account_type", label: "Type", kind: "status" },
      { key: "balance", label: "Balance", kind: "money", align: "right" },
      { key: "is_active", label: "Active", kind: "boolean", align: "center" }
    ],
    rows: [
      { id: "acc-1", code: "1000", name: "Operating Bank", account_type: "bank", balance: money(88420), is_active: true },
      { id: "acc-2", code: "1200", name: "Accounts Receivable", account_type: "accounts_receivable", balance: money(24120), is_active: true },
      { id: "acc-3", code: "2000", name: "Accounts Payable", account_type: "accounts_payable", balance: money(3280), is_active: true },
      { id: "acc-4", code: "4000", name: "Consulting Revenue", account_type: "revenue", balance: money(143800), is_active: true }
    ],
    formFields: []
  },
  "bank-accounts": {
    key: "bank-accounts",
    title: "Bank Accounts",
    entityName: "bank account",
    description: "Import statements, match transactions, and reconcile balances.",
    apiPath: "/api/v1/bank-accounts",
    columns: [
      { key: "name", label: "Account" },
      { key: "institution_name", label: "Institution" },
      { key: "currency", label: "Currency", align: "center" },
      { key: "current_balance", label: "Balance", kind: "money", align: "right" },
      { key: "is_active", label: "Active", kind: "boolean", align: "center" }
    ],
    rows: [
      { id: "bank-1", name: "Operating Account", institution_name: "First Harbor Bank", currency: "USD", current_balance: money(88420), is_active: true },
      { id: "bank-2", name: "Tax Reserve", institution_name: "First Harbor Bank", currency: "USD", current_balance: money(14150), is_active: true }
    ],
    formFields: []
  },
  imports: {
    key: "imports",
    title: "Imports",
    entityName: "import job",
    description: "Bring in Tally, Zoho Books, CSV, and bank statement exports with processing history.",
    apiPath: "/api/v1/imports",
    newPath: "/imports/new",
    primaryAction: "New import",
    columns: [
      { key: "created_at", label: "Created", kind: "date" },
      { key: "source_type", label: "Source" },
      { key: "entity_type", label: "Entity" },
      { key: "imported_rows", label: "Imported", kind: "number", align: "right" },
      { key: "failed_rows", label: "Failed", kind: "number", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "imp-1", created_at: today, source_type: "tally", entity_type: "customers", imported_rows: 24, failed_rows: 0, status: "completed" },
      { id: "imp-2", created_at: "2026-04-19", source_type: "bank_statement", entity_type: "bank_transactions", imported_rows: 38, failed_rows: 2, status: "completed" }
    ],
    formFields: [
      {
        name: "source_type",
        label: "Source",
        type: "select",
        required: true,
        options: [
          { label: "CSV", value: "csv" },
          { label: "Tally", value: "tally" },
          { label: "Zoho Books", value: "zoho_books" },
          { label: "Bank Statement", value: "bank_statement" }
        ]
      },
      {
        name: "entity_type",
        label: "Entity",
        type: "select",
        required: true,
        options: [
          { label: "Customers", value: "customers" },
          { label: "Vendors", value: "vendors" },
          { label: "Invoices", value: "invoices" },
          { label: "Bills", value: "bills" },
          { label: "Payments", value: "payments" },
          { label: "Bank Transactions", value: "bank_transactions" }
        ]
      },
      { name: "file_name", label: "File name", type: "text" },
      { name: "bank_account_id", label: "Bank account ID", type: "text" },
      { name: "payload_text", label: "CSV or JSON payload", type: "textarea", required: true },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  "ocr-bills": {
    key: "ocr-bills",
    title: "OCR Bills",
    entityName: "OCR document",
    description: "Paste OCR output from supplier invoices, extract fields, and convert it into draft bills.",
    apiPath: "/api/v1/ocr/documents",
    newPath: "/ocr-bills/new",
    primaryAction: "New OCR draft",
    columns: [
      { key: "created_at", label: "Created", kind: "date" },
      { key: "source_name", label: "Source" },
      { key: "document_type", label: "Type" },
      { key: "vendor_name", label: "Vendor" },
      { key: "total", label: "Total", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "ocr-1", created_at: today, source_name: "Metro April bill scan", document_type: "bill", vendor_name: "Metro Cloud Hosting", total: money(1180), status: "parsed" }
    ],
    formFields: [
      {
        name: "document_type",
        label: "Document type",
        type: "select",
        required: true,
        options: [
          { label: "Bill", value: "bill" },
          { label: "Invoice", value: "invoice" }
        ]
      },
      { name: "source_name", label: "Source name", type: "text", required: true },
      { name: "source_text", label: "OCR text", type: "textarea", required: true },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  "period-locks": {
    key: "period-locks",
    title: "Period Locks",
    entityName: "period lock",
    description: "Lock accounting periods after close to prevent back-dated edits across sales, purchases, banking, and journals.",
    apiPath: "/api/v1/period-locks",
    newPath: "/period-locks/new",
    primaryAction: "Lock period",
    columns: [
      { key: "start_date", label: "Start", kind: "date" },
      { key: "end_date", label: "End", kind: "date" },
      { key: "lock_scope", label: "Scope" },
      { key: "reason", label: "Reason" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "lock-1", start_date: "2026-03-01", end_date: "2026-03-31", lock_scope: "all", reason: "March close", status: "active" }
    ],
    formFields: [
      { name: "start_date", label: "Start date", type: "date", required: true },
      { name: "end_date", label: "End date", type: "date", required: true },
      {
        name: "lock_scope",
        label: "Scope",
        type: "select",
        required: true,
        options: [
          { label: "All", value: "all" },
          { label: "Sales", value: "sales" },
          { label: "Purchases", value: "purchases" },
          { label: "Banking", value: "banking" },
          { label: "Journals", value: "journals" }
        ]
      },
      { name: "reason", label: "Reason", type: "textarea" },
      { name: "is_active", label: "Active", type: "checkbox" }
    ]
  },
  budgets: {
    key: "budgets",
    title: "Budgets",
    entityName: "budget",
    description: "Plan annual spend by account and monitor variance through the year.",
    apiPath: "/api/v1/budgets",
    columns: [
      { key: "name", label: "Budget" },
      { key: "fiscal_year", label: "Year", align: "center" },
      { key: "total_amount", label: "Total", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "bud-1", name: "FY2026 Operating Budget", fiscal_year: 2026, total_amount: money(420000), status: "active" }
    ],
    formFields: []
  },
  "fixed-assets": {
    key: "fixed-assets",
    title: "Fixed Assets",
    entityName: "asset",
    description: "Track asset purchases, depreciation schedules, disposals, and book value.",
    apiPath: "/api/v1/fixed-assets",
    newPath: "/fixed-assets/new",
    primaryAction: "New asset",
    columns: [
      { key: "asset_number", label: "Asset" },
      { key: "name", label: "Name" },
      { key: "purchase_cost", label: "Cost", kind: "money", align: "right" },
      { key: "book_value", label: "Book value", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "fa-1", asset_number: "FA-0001", name: "MacBook Pro fleet", purchase_cost: money(18600), book_value: money(15500), status: "active" }
    ],
    formFields: []
  },
  inventory: {
    key: "inventory",
    title: "Inventory",
    entityName: "item",
    description: "Maintain products, FIFO valuation, stock levels, and reorder alerts.",
    apiPath: "/api/v1/inventory",
    columns: [
      { key: "sku", label: "SKU" },
      { key: "name", label: "Item" },
      { key: "quantity_on_hand", label: "On hand", kind: "number", align: "right" },
      { key: "sales_price", label: "Price", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "item-1", sku: "CONSULT-HR", name: "Consulting hour", quantity_on_hand: 0, sales_price: money(180), status: "service" },
      { id: "item-2", sku: "KIT-STARTER", name: "Implementation kit", quantity_on_hand: 18, sales_price: money(950), status: "in_stock" }
    ],
    formFields: []
  },
  projects: {
    key: "projects",
    title: "Projects",
    entityName: "project",
    description: "Track budgets, billable work, expenses, and profitability by project.",
    apiPath: "/api/v1/projects",
    columns: [
      { key: "name", label: "Project" },
      { key: "customer", label: "Customer" },
      { key: "budget_amount", label: "Budget", kind: "money", align: "right" },
      { key: "profitability", label: "Profitability", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "proj-1", name: "Northstar rollout", customer: "Northstar Labs", budget_amount: money(52000), profitability: money(18400), status: "active" }
    ],
    formFields: []
  },
  "time-tracking": {
    key: "time-tracking",
    title: "Time Tracking",
    entityName: "time entry",
    description: "Log project hours, mark billable work, and keep timesheet billing readiness visible.",
    apiPath: "/api/v1/time-entries",
    newPath: "/time-tracking/new",
    primaryAction: "Log time",
    columns: [
      { key: "work_date", label: "Date", kind: "date" },
      { key: "project_id", label: "Project" },
      { key: "description", label: "Description" },
      { key: "hours", label: "Hours", kind: "number", align: "right" },
      { key: "rate", label: "Rate", kind: "money", align: "right" },
      { key: "is_billable", label: "Billable", kind: "boolean", align: "center" }
    ],
    rows: [{ id: "time-1", work_date: today, project_id: "proj-1", description: "Discovery workshop and GST workflow mapping", hours: 6.5, rate: money(1800), is_billable: true }],
    formFields: [
      { name: "project_id", label: "Project ID", type: "text", required: true },
      { name: "work_date", label: "Work date", type: "date", required: true },
      { name: "hours", label: "Hours", type: "number", required: true },
      { name: "rate", label: "Billable rate", type: "money" },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "is_billable", label: "Billable", type: "checkbox" },
      { name: "is_billed", label: "Already billed", type: "checkbox" }
    ]
  },
  taxes: {
    key: "taxes",
    title: "Taxes",
    entityName: "tax rate",
    description: "Configure collected and recoverable tax rates, including compound tax.",
    apiPath: "/api/v1/taxes",
    columns: [
      { key: "name", label: "Tax" },
      { key: "rate", label: "Rate", kind: "number", align: "right" },
      { key: "tax_type", label: "Type" },
      { key: "is_compound", label: "Compound", kind: "boolean", align: "center" },
      { key: "is_active", label: "Active", kind: "boolean", align: "center" }
    ],
    rows: [
      { id: "tax-1", name: "GST 5%", rate: 5, tax_type: "GST", is_compound: false, is_active: true },
      { id: "tax-2", name: "VAT 20%", rate: 20, tax_type: "VAT", is_compound: false, is_active: true }
    ],
    formFields: []
  },
  currencies: {
    key: "currencies",
    title: "Currencies",
    entityName: "currency",
    description: "Manage enabled transaction currencies and decimal precision.",
    apiPath: "/api/v1/currencies",
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "symbol", label: "Symbol", align: "center" },
      { key: "decimal_places", label: "Decimals", kind: "number", align: "right" }
    ],
    rows: [
      { id: "USD", code: "USD", name: "US Dollar", symbol: "$", decimal_places: 2 },
      { id: "INR", code: "INR", name: "Indian Rupee", symbol: "Rs", decimal_places: 2 },
      { id: "EUR", code: "EUR", name: "Euro", symbol: "EUR", decimal_places: 2 }
    ],
    formFields: []
  }
};

export function getModuleConfig(key: string) {
  const config = moduleConfigs[key];
  if (!config) {
    throw new Error(`Unknown module: ${key}`);
  }
  return config;
}
