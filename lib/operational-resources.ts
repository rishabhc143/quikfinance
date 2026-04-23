import { z } from "zod";

export type OperationalResource = {
  key: string;
  table: string;
  title: string;
  orderColumn?: string;
  searchableColumns: string[];
  userColumns?: string[];
  sample: Record<string, unknown>;
  schema: z.ZodType<Record<string, unknown>>;
};

const looseJson = z.record(z.unknown()).default({});

const approvalSchema = z.object({
  request_type: z.string().default("transaction_approval"),
  entity_type: z.string().optional().nullable(),
  entity_id: z.string().uuid().optional().nullable(),
  title: z.string().min(2).default("Approval request"),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().default(0),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).default("pending"),
  assigned_role: z.string().default("owner"),
  comments: z.string().optional().nullable()
});

const exceptionSchema = z.object({
  category: z.string().default("operations"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  title: z.string().min(2).default("Workflow exception"),
  description: z.string().optional().nullable(),
  entity_type: z.string().optional().nullable(),
  entity_id: z.string().uuid().optional().nullable(),
  status: z.enum(["open", "in_progress", "resolved", "ignored"]).default("open"),
  resolution: z.string().optional().nullable()
});

const ruleSchema = z.object({
  name: z.string().min(2).default("Automation rule"),
  trigger_type: z.string().default("invoice_overdue"),
  conditions: looseJson,
  actions: z.array(z.unknown()).default([]),
  is_active: z.coerce.boolean().default(true)
});

const itcSchema = z.object({
  vendor_name: z.string().min(2).default("Vendor"),
  vendor_gstin: z.string().optional().nullable(),
  bill_number: z.string().min(1).default("BILL-REVIEW"),
  bill_date: z.string().optional().nullable(),
  taxable_value: z.coerce.number().default(0),
  tax_amount: z.coerce.number().default(0),
  gstr2b_tax_amount: z.coerce.number().default(0),
  match_status: z.enum(["matched", "partial", "unmatched", "blocked"]).default("unmatched"),
  action_status: z.enum(["review", "claim", "hold", "rejected"]).default("review"),
  notes: z.string().optional().nullable()
});

const settlementSchema = z.object({
  settlement_id: z.string().min(2).default(() => `setl_${Date.now()}`),
  settlement_date: z.string().default(() => new Date().toISOString().slice(0, 10)),
  gross_amount: z.coerce.number().default(0),
  fee_amount: z.coerce.number().default(0),
  tax_amount: z.coerce.number().default(0),
  net_amount: z.coerce.number().default(0),
  status: z.enum(["pending", "matched", "posted", "exception"]).default("pending"),
  raw_payload: looseJson
});

const warehouseSchema = z.object({
  code: z.string().min(2).default("MAIN"),
  name: z.string().min(2).default("Main Warehouse"),
  address: looseJson,
  is_active: z.coerce.boolean().default(true)
});

const stockMovementSchema = z.object({
  item_id: z.string().uuid().optional().nullable(),
  warehouse_id: z.string().uuid().optional().nullable(),
  movement_type: z.enum(["receipt", "issue", "transfer", "adjustment", "dispatch"]).default("adjustment"),
  quantity: z.coerce.number().default(0),
  unit_cost: z.coerce.number().default(0),
  source_type: z.string().optional().nullable(),
  source_id: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "posted", "cancelled"]).default("draft"),
  reason: z.string().optional().nullable()
});

const migrationSchema = z.object({
  source_type: z.enum(["tally", "zoho_books", "csv", "bank_statement", "marketplace"]).default("tally"),
  entity_type: z.string().default("trial_balance"),
  file_name: z.string().optional().nullable(),
  status: z.enum(["mapping", "validating", "ready", "imported", "failed"]).default("mapping"),
  total_rows: z.coerce.number().int().default(0),
  imported_rows: z.coerce.number().int().default(0),
  failed_rows: z.coerce.number().int().default(0),
  validation_summary: looseJson
});

const documentSchema = z.object({
  entity_type: z.string().optional().nullable(),
  entity_id: z.string().uuid().optional().nullable(),
  document_type: z.string().default("attachment"),
  file_name: z.string().min(2).default("document.pdf"),
  file_path: z.string().optional().nullable(),
  status: z.enum(["indexed", "ocr_review", "duplicate", "archived"]).default("indexed"),
  confidence_score: z.coerce.number().optional().nullable(),
  duplicate_of: z.string().uuid().optional().nullable(),
  extracted_fields: looseJson
});

const closeTaskSchema = z.object({
  period_start: z.string().default(() => new Date().toISOString().slice(0, 10)),
  period_end: z.string().default(() => new Date().toISOString().slice(0, 10)),
  title: z.string().min(2).default("Close task"),
  owner_role: z.string().default("accountant"),
  status: z.enum(["open", "in_progress", "done", "blocked"]).default("open"),
  due_date: z.string().optional().nullable()
});

const insightSchema = z.object({
  insight_type: z.string().default("finance_copilot"),
  title: z.string().min(2).default("Finance insight"),
  summary: z.string().min(2).default("Review this finance insight."),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
  status: z.enum(["open", "accepted", "dismissed", "resolved"]).default("open"),
  source_payload: looseJson
});

export const operationalResources: Record<string, OperationalResource> = {
  approvals: {
    key: "approvals",
    table: "approval_requests",
    title: "Approval Requests",
    searchableColumns: ["title", "description", "entity_type"],
    userColumns: ["requested_by"],
    sample: { title: "Approve high-value vendor bill", description: "Maker-checker review before AP posting.", amount: 75000, priority: "high" },
    schema: approvalSchema
  },
  "audit-trail": {
    key: "audit-trail",
    table: "audit_logs",
    title: "Audit Trail",
    searchableColumns: ["action", "entity_type"],
    userColumns: ["user_id"],
    sample: { action: "review", entity_type: "system", entity_id: null, new_values: { note: "Audit review event" } },
    schema: z.object({
      action: z.string().default("review"),
      entity_type: z.string().default("system"),
      entity_id: z.string().uuid().optional().nullable(),
      old_values: looseJson.optional(),
      new_values: looseJson.optional()
    })
  },
  "exception-queue": {
    key: "exception-queue",
    table: "workflow_exceptions",
    title: "Workflow Exceptions",
    searchableColumns: ["title", "category", "description"],
    sample: { category: "gst", severity: "high", title: "Missing place of supply", description: "Invoice needs GST review before filing." },
    schema: exceptionSchema
  },
  "rules-engine": {
    key: "rules-engine",
    table: "automation_rules",
    title: "Automation Rules",
    searchableColumns: ["name", "trigger_type"],
    userColumns: ["created_by"],
    sample: { name: "Overdue invoice reminder", trigger_type: "invoice_overdue", actions: [{ type: "create_exception" }] },
    schema: ruleSchema
  },
  "gst-command-center": {
    key: "gst-command-center",
    table: "workflow_exceptions",
    title: "GST Exceptions",
    searchableColumns: ["title", "category", "description"],
    sample: { category: "gst", severity: "critical", title: "GSTR filing blocker", description: "Resolve GST mismatch before filing." },
    schema: exceptionSchema
  },
  "itc-reconciliation": {
    key: "itc-reconciliation",
    table: "gst_itc_reconciliations",
    title: "ITC Reconciliation",
    searchableColumns: ["vendor_name", "vendor_gstin", "bill_number"],
    sample: { vendor_name: "Metro Cloud Hosting", bill_number: "BILL-ITC-001", taxable_value: 10000, tax_amount: 1800, gstr2b_tax_amount: 0, match_status: "unmatched" },
    schema: itcSchema
  },
  "payment-operations": {
    key: "payment-operations",
    table: "razorpay_settlements",
    title: "Razorpay Settlements",
    searchableColumns: ["settlement_id", "status"],
    sample: { settlement_id: "setl_demo_001", settlement_date: new Date().toISOString().slice(0, 10), gross_amount: 1180, fee_amount: 24, tax_amount: 4.32, net_amount: 1151.68 },
    schema: settlementSchema
  },
  warehouses: {
    key: "warehouses",
    table: "warehouses",
    title: "Warehouses",
    searchableColumns: ["code", "name"],
    sample: { code: "MAIN", name: "Main Warehouse", address: { city: "Indore" } },
    schema: warehouseSchema
  },
  "stock-movements": {
    key: "stock-movements",
    table: "stock_movements",
    title: "Stock Movements",
    searchableColumns: ["movement_type", "source_type", "reason"],
    userColumns: ["created_by"],
    sample: { movement_type: "adjustment", quantity: 1, unit_cost: 950, reason: "Opening physical count adjustment" },
    schema: stockMovementSchema
  },
  "migration-center": {
    key: "migration-center",
    table: "migration_batches",
    title: "Migration Batches",
    searchableColumns: ["source_type", "entity_type", "file_name"],
    userColumns: ["created_by"],
    sample: { source_type: "tally", entity_type: "trial_balance", file_name: "tally-export.xlsx", total_rows: 120, status: "mapping" },
    schema: migrationSchema
  },
  documents: {
    key: "documents",
    table: "document_index",
    title: "Document Index",
    searchableColumns: ["document_type", "file_name", "entity_type"],
    userColumns: ["created_by"],
    sample: { document_type: "supplier_bill", file_name: "metro-cloud-bill.pdf", status: "ocr_review", confidence_score: 86 },
    schema: documentSchema
  },
  "close-management": {
    key: "close-management",
    table: "close_tasks",
    title: "Close Tasks",
    searchableColumns: ["title", "owner_role", "status"],
    sample: { title: "Review bank reconciliation", owner_role: "accountant", status: "open" },
    schema: closeTaskSchema
  },
  "finance-copilot": {
    key: "finance-copilot",
    table: "finance_insights",
    title: "Finance Insights",
    searchableColumns: ["title", "summary", "insight_type"],
    sample: { insight_type: "anomaly", title: "Expense spike detected", summary: "Travel expenses are above the last 3-month average.", severity: "warning" },
    schema: insightSchema
  }
};

export const workflowResourceMap: Record<string, string> = {
  collections: "exception-queue",
  "recurring-invoices": "rules-engine",
  "goods-receipts": "stock-movements",
  payables: "approvals",
  "recurring-bills": "rules-engine",
  ledgers: "audit-trail",
  "day-book": "audit-trail",
  "gst-command-center": "gst-command-center",
  "itc-reconciliation": "itc-reconciliation",
  warehouses: "warehouses",
  "stock-movements": "stock-movements",
  documents: "documents",
  "migration-center": "migration-center",
  approvals: "approvals",
  "audit-trail": "audit-trail",
  "payment-operations": "payment-operations",
  "exception-queue": "exception-queue",
  "rules-engine": "rules-engine",
  "close-management": "close-management",
  "finance-copilot": "finance-copilot"
};

export function getOperationalResource(key: string) {
  const resourceKey = workflowResourceMap[key] ?? key;
  return operationalResources[resourceKey] ?? null;
}
