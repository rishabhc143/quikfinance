import {
  Activity,
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Bot,
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
  FileSearch,
  FileSpreadsheet,
  Landmark,
  Package,
  Receipt,
  Repeat2,
  ScanText,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Truck,
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
  listPath?: string;
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

export type NavigationGroup = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Workspace",
    icon: Activity,
    items: [
      { title: "Dashboard", href: "/", icon: Activity },
      { title: "Global Search", href: "/search", icon: Search },
      { title: "Tasks / Exceptions", href: "/exception-queue", icon: ShieldCheck },
      { title: "AI Copilot", href: "/finance-copilot", icon: Bot }
    ]
  },
  {
    label: "Revenue",
    icon: CircleDollarSign,
    items: [
      { title: "Customers", href: "/customers", icon: Users },
      { title: "Quotations", href: "/quotations", icon: FileText },
      { title: "Sales Orders", href: "/sales-orders", icon: ClipboardList },
      { title: "Delivery / Dispatch", href: "/delivery-dispatch", icon: Truck },
      { title: "Invoices", href: "/invoices", icon: FileText },
      { title: "Credit Notes", href: "/credit-notes", icon: Repeat2 },
      { title: "Payments Received", href: "/payments/received", icon: CircleDollarSign },
      { title: "Collections", href: "/collections", icon: WalletCards }
    ]
  },
  {
    label: "Procurement",
    icon: Building2,
    items: [
      { title: "Vendors", href: "/vendors", icon: Building2 },
      { title: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
      { title: "Goods Receipts (GRN)", href: "/goods-receipts", icon: Package },
      { title: "Bills", href: "/bills", icon: ClipboardList },
      { title: "Vendor Credits", href: "/vendor-credits", icon: Repeat2 },
      { title: "Payments Made", href: "/payments/made", icon: CreditCard },
      { title: "Payables", href: "/payables", icon: WalletCards }
    ]
  },
  {
    label: "Banking",
    icon: Landmark,
    items: [
      { title: "Bank Accounts", href: "/bank-accounts", icon: Landmark },
      { title: "Bank Feeds", href: "/bank-feeds", icon: Activity },
      { title: "Reconciliation", href: "/bank-accounts", icon: FileSearch },
      { title: "Transfers", href: "/transfers", icon: ArrowLeftRight },
      { title: "Payment Gateways", href: "/payment-gateways", icon: Cable },
      { title: "Settlements", href: "/settlements", icon: CreditCard }
    ]
  },
  {
    label: "Accounting",
    icon: BookOpen,
    items: [
      { title: "Chart of Accounts", href: "/chart-of-accounts", icon: BookOpen },
      { title: "Journal Entries", href: "/journal-entries", icon: Calculator },
      { title: "Ledger", href: "/ledgers", icon: BookOpen },
      { title: "Day Book", href: "/day-book", icon: ClipboardList },
      { title: "Period Close", href: "/close-management", icon: ShieldCheck },
      { title: "Period Locks", href: "/period-locks", icon: ShieldCheck },
      { title: "Audit Trail", href: "/audit-trail", icon: ClipboardList }
    ]
  },
  {
    label: "Inventory",
    icon: Boxes,
    items: [
      { title: "Items", href: "/inventory", icon: Package },
      { title: "Warehouses", href: "/warehouses", icon: Boxes },
      { title: "Stock Adjustments", href: "/stock-movements", icon: Repeat2 },
      { title: "Transfers", href: "/stock-movements", icon: ArrowLeftRight },
      { title: "Valuation", href: "/inventory", icon: Calculator },
      { title: "Reorder", href: "/warehouses", icon: Activity }
    ]
  },
  {
    label: "Tax & Compliance",
    icon: Receipt,
    items: [
      { title: "GST Command Center", href: "/gst-command-center", icon: Receipt },
      { title: "GSTR-1", href: "/reports/gstr-1", icon: FileSpreadsheet },
      { title: "GSTR-3B", href: "/reports/gstr-3b", icon: FileSpreadsheet },
      { title: "GSTR-2B / ITC", href: "/itc-reconciliation", icon: Tags },
      { title: "E-Invoicing", href: "/e-invoicing", icon: FileText },
      { title: "E-Way Bill", href: "/e-way-bill", icon: Truck },
      { title: "TDS/TCS", href: "/tds-tcs", icon: Receipt }
    ]
  },
  {
    label: "Reports",
    icon: FileBarChart,
    items: [
      { title: "Financials", href: "/reports", icon: FileBarChart },
      { title: "Sales / Purchase Registers", href: "/reports/outstanding", icon: FileSpreadsheet },
      { title: "Inventory", href: "/inventory", icon: Package },
      { title: "GST", href: "/reports/gst-summary", icon: Receipt },
      { title: "Project Profitability", href: "/projects", icon: Briefcase },
      { title: "Cash Flow", href: "/reports/cash-flow", icon: ChartNoAxesCombined },
      { title: "Budget vs Actual", href: "/budgets", icon: BarChart3 }
    ]
  },
  {
    label: "Automation",
    icon: Settings,
    items: [
      { title: "OCR Inbox", href: "/ocr-bills", icon: ScanText },
      { title: "Imports / Migration", href: "/migration-center", icon: Upload },
      { title: "Rules Engine", href: "/rules-engine", icon: Settings },
      { title: "Workflows", href: "/approvals", icon: ShieldCheck },
      { title: "Integrations", href: "/integrations", icon: Cable },
      { title: "Job Logs", href: "/audit-trail", icon: ClipboardList },
      { title: "Exceptions", href: "/exception-queue", icon: ShieldCheck }
    ]
  },
  {
    label: "Settings",
    icon: Settings,
    items: [
      { title: "Company", href: "/settings", icon: Settings },
      { title: "Taxes", href: "/settings/taxes", icon: Tags },
      { title: "Currencies", href: "/settings/currencies", icon: Banknote },
      { title: "Roles & Permissions", href: "/settings/users", icon: ShieldCheck },
      { title: "Templates", href: "/templates", icon: FileText },
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
    listPath: "/payments/received",
    newPath: "/payments/received/new",
    primaryAction: "Record payment",
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
    formFields: [
      { name: "contact_id", label: "Customer ID", type: "text" },
      { name: "payment_type", label: "Payment type", type: "select", required: true, options: [{ label: "Received", value: "received" }] },
      { name: "payment_date", label: "Payment date", type: "date", required: true },
      { name: "amount", label: "Amount", type: "money", required: true },
      { name: "currency", label: "Currency", type: "select", options: [{ label: "INR", value: "INR" }, { label: "USD", value: "USD" }] },
      { name: "exchange_rate", label: "Exchange rate", type: "number" },
      { name: "method", label: "Method", type: "text", required: true },
      { name: "reference", label: "Reference", type: "text" },
      { name: "status", label: "Status", type: "select", required: true, options: [{ label: "Draft", value: "draft" }, { label: "Posted", value: "posted" }, { label: "Void", value: "void" }] },
      { name: "memo", label: "Memo", type: "textarea" }
    ]
  },
  "payments-made": {
    key: "payments-made",
    title: "Payments Made",
    entityName: "payment",
    description: "Record vendor payments and reconcile them to bank activity.",
    apiPath: "/api/v1/payments?type=made",
    listPath: "/payments/made",
    newPath: "/payments/made/new",
    primaryAction: "Record payout",
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
    formFields: [
      { name: "contact_id", label: "Vendor ID", type: "text" },
      { name: "payment_type", label: "Payment type", type: "select", required: true, options: [{ label: "Made", value: "made" }] },
      { name: "payment_date", label: "Payment date", type: "date", required: true },
      { name: "amount", label: "Amount", type: "money", required: true },
      { name: "currency", label: "Currency", type: "select", options: [{ label: "INR", value: "INR" }, { label: "USD", value: "USD" }] },
      { name: "exchange_rate", label: "Exchange rate", type: "number" },
      { name: "method", label: "Method", type: "text", required: true },
      { name: "reference", label: "Reference", type: "text" },
      { name: "status", label: "Status", type: "select", required: true, options: [{ label: "Draft", value: "draft" }, { label: "Posted", value: "posted" }, { label: "Void", value: "void" }] },
      { name: "memo", label: "Memo", type: "textarea" }
    ]
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
    newPath: "/chart-of-accounts/new",
    primaryAction: "New account",
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
    formFields: [
      { name: "code", label: "Code", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      {
        name: "account_type",
        label: "Account type",
        type: "select",
        required: true,
        options: [
          { label: "Bank", value: "bank" },
          { label: "Accounts Receivable", value: "accounts_receivable" },
          { label: "Accounts Payable", value: "accounts_payable" },
          { label: "Revenue", value: "revenue" },
          { label: "Expense", value: "expense" },
          { label: "Asset", value: "asset" },
          { label: "Liability", value: "liability" },
          { label: "Equity", value: "equity" }
        ]
      },
      { name: "balance", label: "Opening balance", type: "money" },
      { name: "is_active", label: "Active", type: "checkbox" }
    ]
  },
  "bank-accounts": {
    key: "bank-accounts",
    title: "Bank Accounts",
    entityName: "bank account",
    description: "Import statements, match transactions, and reconcile balances.",
    apiPath: "/api/v1/bank-accounts",
    newPath: "/bank-accounts/new",
    primaryAction: "New bank account",
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
    formFields: [
      { name: "account_id", label: "Account ID", type: "text" },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "institution_name", label: "Institution", type: "text" },
      { name: "account_number_last4", label: "Last 4 digits", type: "text" },
      { name: "currency", label: "Currency", type: "select", options: [{ label: "INR", value: "INR" }, { label: "USD", value: "USD" }] },
      { name: "current_balance", label: "Current balance", type: "money" },
      { name: "is_active", label: "Active", type: "checkbox" }
    ]
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
  "bank-feeds": {
    key: "bank-feeds",
    title: "Bank Feeds",
    entityName: "bank feed",
    description: "Import and review bank statement feeds before reconciliation and exception handling.",
    apiPath: "/api/v1/bank-feeds",
    newPath: "/bank-feeds/new",
    primaryAction: "New bank feed",
    columns: [
      { key: "feed_name", label: "Feed" },
      { key: "source_type", label: "Source" },
      { key: "imported_on", label: "Imported", kind: "date" },
      { key: "line_count", label: "Lines", kind: "number", align: "right" },
      { key: "closing_balance", label: "Closing balance", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "feed-1", feed_name: "HDFC Main Account Apr 2026", source_type: "upload", imported_on: today, line_count: 184, closing_balance: money(245800), status: "pending_review" }
    ],
    formFields: [
      { name: "bank_account_id", label: "Bank account ID", type: "text" },
      { name: "feed_name", label: "Feed name", type: "text", required: true },
      {
        name: "source_type",
        label: "Source type",
        type: "select",
        required: true,
        options: [
          { label: "Upload", value: "upload" },
          { label: "API", value: "api" },
          { label: "Manual", value: "manual" }
        ]
      },
      { name: "imported_on", label: "Imported on", type: "date", required: true },
      { name: "statement_date", label: "Statement date", type: "date", required: true },
      { name: "opening_balance", label: "Opening balance", type: "money", required: true },
      { name: "closing_balance", label: "Closing balance", type: "money", required: true },
      { name: "line_count", label: "Line count", type: "number", required: true },
      {
        name: "currency",
        label: "Currency",
        type: "select",
        options: [
          { label: "INR", value: "INR" },
          { label: "USD", value: "USD" }
        ]
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { label: "Pending review", value: "pending_review" },
          { label: "Processing", value: "processing" },
          { label: "Reconciled", value: "reconciled" },
          { label: "Error", value: "error" }
        ]
      },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  "delivery-dispatch": {
    key: "delivery-dispatch",
    title: "Delivery / Dispatch",
    entityName: "dispatch",
    description: "Manage shipment releases, proof status, and sales-order fulfillment movement.",
    apiPath: "/api/v1/delivery-dispatch",
    newPath: "/delivery-dispatch/new",
    primaryAction: "New dispatch",
    columns: [
      { key: "dispatch_number", label: "Dispatch" },
      { key: "dispatch_date", label: "Date", kind: "date" },
      { key: "carrier_name", label: "Carrier" },
      { key: "tracking_number", label: "Tracking" },
      { key: "shipped_value", label: "Shipped value", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "disp-1", dispatch_number: "DSP-100201", dispatch_date: today, carrier_name: "BlueDart", tracking_number: "AWB-998812", shipped_value: money(18200), status: "shipped" }
    ],
    formFields: [
      { name: "sales_order_id", label: "Sales order ID", type: "text" },
      { name: "customer_id", label: "Customer ID", type: "text" },
      { name: "warehouse_id", label: "Warehouse ID", type: "text" },
      { name: "dispatch_date", label: "Dispatch date", type: "date", required: true },
      { name: "carrier_name", label: "Carrier name", type: "text", required: true },
      { name: "tracking_number", label: "Tracking number", type: "text" },
      { name: "shipped_value", label: "Shipped value", type: "money", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { label: "Draft", value: "draft" },
          { label: "Packed", value: "packed" },
          { label: "Shipped", value: "shipped" },
          { label: "Delivered", value: "delivered" },
          { label: "Cancelled", value: "cancelled" }
        ]
      },
      {
        name: "proof_status",
        label: "Proof status",
        type: "select",
        required: true,
        options: [
          { label: "Pending", value: "pending" },
          { label: "Received", value: "received" },
          { label: "Not required", value: "not_required" }
        ]
      },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  "e-invoicing": {
    key: "e-invoicing",
    title: "E-Invoicing",
    entityName: "e-invoice submission",
    description: "Track IRN generation submissions, acknowledgements, and failed compliance payloads.",
    apiPath: "/api/v1/e-invoicing",
    newPath: "/e-invoicing/new",
    primaryAction: "New submission",
    columns: [
      { key: "submission_number", label: "Submission" },
      { key: "invoice_number", label: "Invoice" },
      { key: "submission_date", label: "Submitted", kind: "date" },
      { key: "taxable_value", label: "Taxable value", kind: "money", align: "right" },
      { key: "irn", label: "IRN" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "einv-1", submission_number: "EINV-448812", invoice_number: "INV-240401", submission_date: today, taxable_value: money(10000), irn: "IRN-DEMO-001", status: "generated" }
    ],
    formFields: [
      { name: "invoice_id", label: "Invoice ID", type: "text" },
      { name: "invoice_number", label: "Invoice number", type: "text", required: true },
      { name: "submission_date", label: "Submission date", type: "date", required: true },
      { name: "taxable_value", label: "Taxable value", type: "money", required: true },
      { name: "total_tax", label: "Total tax", type: "money", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { label: "Draft", value: "draft" },
          { label: "Queued", value: "queued" },
          { label: "Submitted", value: "submitted" },
          { label: "Generated", value: "generated" },
          { label: "Failed", value: "failed" },
          { label: "Cancelled", value: "cancelled" }
        ]
      },
      { name: "irn", label: "IRN", type: "text" },
      { name: "ack_number", label: "Acknowledgement number", type: "text" },
      { name: "ack_date", label: "Acknowledgement date", type: "date" },
      { name: "error_message", label: "Error message", type: "textarea" }
    ]
  },
  "tds-tcs": {
    key: "tds-tcs",
    title: "TDS / TCS",
    entityName: "tax record",
    description: "Maintain withholding and collection tax records across bills, invoices, payments, and review cycles.",
    apiPath: "/api/v1/tds-tcs",
    newPath: "/tds-tcs/new",
    primaryAction: "New tax record",
    columns: [
      { key: "section_code", label: "Section" },
      { key: "tax_kind", label: "Kind" },
      { key: "transaction_type", label: "Transaction" },
      { key: "assessment_date", label: "Assessment", kind: "date" },
      { key: "tax_amount", label: "Tax amount", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "tds-1", section_code: "194C", tax_kind: "tds", transaction_type: "bill", assessment_date: today, tax_amount: money(860), status: "review" }
    ],
    formFields: [
      { name: "section_code", label: "Section code", type: "text", required: true },
      {
        name: "tax_kind",
        label: "Tax kind",
        type: "select",
        required: true,
        options: [
          { label: "TDS", value: "tds" },
          { label: "TCS", value: "tcs" }
        ]
      },
      {
        name: "transaction_type",
        label: "Transaction type",
        type: "select",
        required: true,
        options: [
          { label: "Bill", value: "bill" },
          { label: "Invoice", value: "invoice" },
          { label: "Payment", value: "payment" },
          { label: "Journal", value: "journal" }
        ]
      },
      { name: "transaction_id", label: "Transaction ID", type: "text" },
      {
        name: "party_type",
        label: "Party type",
        type: "select",
        required: true,
        options: [
          { label: "Vendor", value: "vendor" },
          { label: "Customer", value: "customer" }
        ]
      },
      { name: "party_id", label: "Party ID", type: "text" },
      { name: "assessment_date", label: "Assessment date", type: "date", required: true },
      { name: "base_amount", label: "Base amount", type: "money", required: true },
      { name: "tax_rate", label: "Tax rate", type: "number", required: true },
      { name: "tax_amount", label: "Tax amount", type: "money", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { label: "Draft", value: "draft" },
          { label: "Review", value: "review" },
          { label: "Posted", value: "posted" },
          { label: "Filed", value: "filed" }
        ]
      },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  budgets: {
    key: "budgets",
    title: "Budgets",
    entityName: "budget",
    description: "Plan annual spend by account and monitor variance through the year.",
    apiPath: "/api/v1/budgets",
    newPath: "/budgets/new",
    primaryAction: "New budget",
    columns: [
      { key: "name", label: "Budget" },
      { key: "fiscal_year", label: "Year", align: "center" },
      { key: "total_amount", label: "Total", kind: "money", align: "right" },
      { key: "status", label: "Status", kind: "status" }
    ],
    rows: [
      { id: "bud-1", name: "FY2026 Operating Budget", fiscal_year: 2026, total_amount: money(420000), status: "active" }
    ],
    formFields: [
      { name: "name", label: "Budget name", type: "text", required: true },
      { name: "fiscal_year", label: "Fiscal year", type: "number", required: true },
      { name: "total_amount", label: "Total amount", type: "money", required: true },
      { name: "status", label: "Status", type: "select", required: true, options: [{ label: "Draft", value: "draft" }, { label: "Active", value: "active" }, { label: "Archived", value: "archived" }] }
    ]
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
    formFields: [
      { name: "name", label: "Asset name", type: "text", required: true },
      { name: "purchase_date", label: "Purchase date", type: "date", required: true },
      { name: "purchase_cost", label: "Purchase cost", type: "money", required: true },
      { name: "salvage_value", label: "Salvage value", type: "money" },
      { name: "useful_life_months", label: "Useful life months", type: "number", required: true },
      { name: "depreciation_method", label: "Depreciation method", type: "select", required: true, options: [{ label: "Straight line", value: "straight_line" }, { label: "Declining balance", value: "declining_balance" }] },
      { name: "accumulated_depreciation", label: "Accumulated depreciation", type: "money" },
      { name: "status", label: "Status", type: "select", required: true, options: [{ label: "Active", value: "active" }, { label: "Disposed", value: "disposed" }, { label: "Retired", value: "retired" }] }
    ]
  },
  inventory: {
    key: "inventory",
    title: "Inventory",
    entityName: "item",
    description: "Maintain products, FIFO valuation, stock levels, and reorder alerts.",
    apiPath: "/api/v1/inventory",
    newPath: "/inventory/new",
    primaryAction: "New item",
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
    formFields: [
      { name: "sku", label: "SKU", type: "text", required: true },
      { name: "name", label: "Item name", type: "text", required: true },
      { name: "unit", label: "Unit", type: "text", required: true },
      { name: "sales_price", label: "Sales price", type: "money", required: true },
      { name: "purchase_price", label: "Purchase price", type: "money", required: true },
      { name: "quantity_on_hand", label: "Quantity on hand", type: "number" },
      { name: "reorder_point", label: "Reorder point", type: "number" },
      { name: "is_active", label: "Active", type: "checkbox" }
    ]
  },
  projects: {
    key: "projects",
    title: "Projects",
    entityName: "project",
    description: "Track budgets, billable work, expenses, and profitability by project.",
    apiPath: "/api/v1/projects",
    newPath: "/projects/new",
    primaryAction: "New project",
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
    formFields: [
      { name: "name", label: "Project name", type: "text", required: true },
      { name: "customer_id", label: "Customer ID", type: "text" },
      { name: "status", label: "Status", type: "select", required: true, options: [{ label: "Planned", value: "planned" }, { label: "Active", value: "active" }, { label: "On hold", value: "on_hold" }, { label: "Complete", value: "complete" }] },
      { name: "budget_amount", label: "Budget amount", type: "money" },
      { name: "billing_method", label: "Billing method", type: "select", required: true, options: [{ label: "Fixed fee", value: "fixed_fee" }, { label: "Time and materials", value: "time_and_materials" }, { label: "Non billable", value: "non_billable" }] }
    ]
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
    listPath: "/settings/taxes",
    newPath: "/settings/taxes/new",
    primaryAction: "New tax rate",
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
    formFields: [
      { name: "name", label: "Tax name", type: "text", required: true },
      { name: "rate", label: "Rate", type: "number", required: true },
      { name: "tax_type", label: "Tax type", type: "text", required: true },
      { name: "is_compound", label: "Compound", type: "checkbox" },
      { name: "is_active", label: "Active", type: "checkbox" }
    ]
  },
  currencies: {
    key: "currencies",
    title: "Currencies",
    entityName: "currency",
    description: "Manage enabled transaction currencies and decimal precision.",
    apiPath: "/api/v1/currencies",
    listPath: "/settings/currencies",
    newPath: "/settings/currencies/new",
    primaryAction: "New currency",
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
    formFields: [
      { name: "code", label: "Currency code", type: "text", required: true },
      { name: "name", label: "Currency name", type: "text", required: true },
      { name: "symbol", label: "Symbol", type: "text", required: true },
      { name: "decimal_places", label: "Decimal places", type: "number", required: true }
    ]
  }
};

export function getModuleConfig(key: string) {
  const config = moduleConfigs[key];
  if (!config) {
    throw new Error(`Unknown module: ${key}`);
  }
  return config;
}
