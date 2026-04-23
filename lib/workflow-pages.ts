import type { WorkflowConfig } from "@/components/shared/WorkflowPage";

export const workflowPages: Record<string, WorkflowConfig> = {
  collections: {
    title: "Collections Workbench",
    description: "Prioritize customer follow-ups, payment links, disputed invoices, and overdue receivables in one operating view.",
    actionLabel: "Create invoice",
    actionHref: "/invoices/new",
    metrics: [
      { label: "Overdue exposure", value: 232000, helper: "Invoices past due and not fully collected" },
      { label: "Due this week", value: 6420, helper: "Receivables requiring reminders" },
      { label: "Payment links", value: "Razorpay ready", helper: "Use invoice payment links for online collection" },
      { label: "Blocked disputes", value: 1, helper: "Requires owner/accountant review" }
    ],
    queues: [
      { title: "Send overdue reminders", description: "Follow up invoices where balance_due is greater than zero and due_date has passed.", status: "AR priority", href: "/invoices" },
      { title: "Create payment link", description: "Open an invoice and generate a Razorpay payment link or UPI collection path.", status: "Online collection", href: "/invoices" },
      { title: "Allocate receipts", description: "Record unapplied customer receipts and match them against open invoices.", status: "Posting", href: "/payments/received" }
    ],
    operatingRules: [
      "A customer payment should reduce Accounts Receivable only after it is posted and allocated to invoice balance.",
      "Credit notes reduce receivable exposure and must reference the original invoice wherever available.",
      "Payment-link webhook events should update link status, amount paid, refunds, and gateway event history."
    ],
    linkedFlows: [
      { title: "Invoices", description: "Create, send, collect, and age invoices.", href: "/invoices" },
      { title: "Payments Received", description: "Record bank, cash, UPI, card, or Razorpay receipts.", href: "/payments/received" },
      { title: "Credit Notes", description: "Handle returns and customer adjustments.", href: "/credit-notes" },
      { title: "Outstanding Report", description: "Review aging by customer and invoice.", href: "/reports/outstanding" }
    ]
  },
  "recurring-invoices": {
    title: "Recurring Invoices",
    description: "Manage subscription and repeat billing templates with review-before-post controls.",
    actionLabel: "New invoice",
    actionHref: "/invoices/new",
    metrics: [
      { label: "Active schedules", value: 3, helper: "Monthly/quarterly invoice templates" },
      { label: "Next run", value: "1 May 2026", helper: "Schedules due for generation" },
      { label: "Draft review", value: 2, helper: "Generated drafts awaiting approval" },
      { label: "Expected MRR", value: 118000, helper: "Projected recurring sales" }
    ],
    queues: [
      { title: "Review generated drafts", description: "Validate taxes, place of supply, billing period, and customer terms before sending.", status: "Maker-checker", href: "/invoices" },
      { title: "Renew expired schedules", description: "Pause or extend schedules whose end date has passed.", status: "Control", href: "/invoices" },
      { title: "Attach collection links", description: "Generate payment links after invoice approval to speed collection.", status: "Razorpay", href: "/invoices" }
    ],
    operatingRules: [
      "Recurring templates should generate draft invoices first; posting should remain explicit for auditability.",
      "GST place-of-supply and item tax rates must be copied from the active customer/item master at generation time.",
      "Every generated invoice should retain a reference to the recurring schedule for traceability."
    ],
    linkedFlows: [
      { title: "Customers", description: "Maintain billing emails, GST treatment, and payment terms.", href: "/customers" },
      { title: "Invoices", description: "Review and send generated drafts.", href: "/invoices" },
      { title: "GST Summary", description: "Validate tax impact before filing.", href: "/reports/gst-summary" }
    ]
  },
  "goods-receipts": {
    title: "Goods Receipt Notes",
    description: "Track purchase-to-stock receipt against approved purchase orders before vendor bill booking.",
    actionLabel: "New purchase order",
    actionHref: "/purchase-orders/new",
    metrics: [
      { label: "POs awaiting receipt", value: 4, helper: "Approved but not fully received" },
      { label: "Partial receipts", value: 1, helper: "Requires balance quantity follow-up" },
      { label: "Bill pending", value: 2, helper: "Receipt completed but vendor bill not booked" },
      { label: "Stock value to receive", value: 18500, helper: "Expected inventory capitalization" }
    ],
    queues: [
      { title: "Receive approved POs", description: "Capture quantity received, rejected quantity, warehouse, and receipt date.", status: "Inventory", href: "/purchase-orders" },
      { title: "Match vendor bill", description: "Convert received goods to bill only after quantity and GST invoice checks pass.", status: "3-way match", href: "/bills/new" },
      { title: "Post stock movement", description: "Increase inventory and update valuation when receipt is accepted.", status: "Accounting", href: "/inventory" }
    ],
    operatingRules: [
      "Goods receipt should not book supplier liability until a bill is approved.",
      "Inventory quantity and value must increase only for accepted received quantity.",
      "Bill quantity should not exceed accepted receipt quantity without override logging."
    ],
    linkedFlows: [
      { title: "Purchase Orders", description: "Approve vendor commitments.", href: "/purchase-orders" },
      { title: "Bills", description: "Book supplier invoices after receipt validation.", href: "/bills" },
      { title: "Inventory", description: "Review stock levels and valuation.", href: "/inventory" }
    ]
  },
  payables: {
    title: "Payables Workbench",
    description: "Control vendor bills, scheduled payouts, TDS/GST checks, and payment approvals.",
    actionLabel: "New bill",
    actionHref: "/bills/new",
    metrics: [
      { label: "Bills due this week", value: 3280, helper: "Approved vendor liability" },
      { label: "Pending approval", value: 2, helper: "Bills waiting maker-checker review" },
      { label: "Vendor credits", value: 2400, helper: "Available to offset payables" },
      { label: "GST ITC watchlist", value: 1, helper: "Bills needing reconciliation" }
    ],
    queues: [
      { title: "Approve bills", description: "Review vendor, GSTIN, tax split, due date, and expense account before posting.", status: "Approval", href: "/bills" },
      { title: "Schedule payments", description: "Select bills for payout based on due date, cash position, and vendor priority.", status: "Treasury", href: "/payments/made" },
      { title: "Apply vendor credits", description: "Offset supplier credits against open bills with audit trail.", status: "Adjustment", href: "/vendor-credits" }
    ],
    operatingRules: [
      "Posted bills credit Accounts Payable and debit expense, inventory, or asset accounts.",
      "Vendor credits should reduce Accounts Payable only when applied to a bill or vendor balance.",
      "Payments made reduce bank/cash and Accounts Payable after approval and posting."
    ],
    linkedFlows: [
      { title: "Bills", description: "Book and approve supplier invoices.", href: "/bills" },
      { title: "Payments Made", description: "Record payouts and bank reconciliation references.", href: "/payments/made" },
      { title: "Vendor Credits", description: "Handle supplier returns and discounts.", href: "/vendor-credits" },
      { title: "GST ITC Reconciliation", description: "Reconcile input tax credit readiness.", href: "/itc-reconciliation" }
    ]
  },
  "recurring-bills": {
    title: "Recurring Bills",
    description: "Track monthly rent, subscriptions, retainers, and utility bills with approval-before-post controls.",
    actionLabel: "New bill",
    actionHref: "/bills/new",
    metrics: [
      { label: "Active schedules", value: 5, helper: "Repeat AP templates" },
      { label: "Next due", value: "30 Apr 2026", helper: "Upcoming bill generation" },
      { label: "Draft bills", value: 2, helper: "Need expense account review" },
      { label: "Monthly run-rate", value: 74200, helper: "Expected recurring payables" }
    ],
    queues: [
      { title: "Review recurring drafts", description: "Validate vendor, period, tax treatment, and due date before posting.", status: "AP close", href: "/bills" },
      { title: "Attach documents", description: "Attach supplier invoice or contract to recurring bill records.", status: "Document control", href: "/documents" },
      { title: "Schedule payout", description: "Move approved recurring bills into payment planning.", status: "Treasury", href: "/payments/made" }
    ],
    operatingRules: [
      "Recurring bill schedules should create draft bills, not posted liabilities.",
      "Expense classification and tax treatment should be reviewed each cycle.",
      "Duplicate bill detection should compare vendor, invoice number, amount, and period."
    ],
    linkedFlows: [
      { title: "Vendors", description: "Maintain supplier terms and GST registration.", href: "/vendors" },
      { title: "Bills", description: "Approve and post recurring drafts.", href: "/bills" },
      { title: "OCR Bills", description: "Use OCR to review supplier documents.", href: "/ocr-bills" }
    ]
  },
  ledgers: {
    title: "Ledgers",
    description: "Review account-wise debit, credit, and balance movement with drill-down to source documents.",
    metrics: [
      { label: "Active accounts", value: 4, helper: "Accounts with movement in this tenant" },
      { label: "Unbalanced entries", value: 0, helper: "Journal integrity check" },
      { label: "Locked periods", value: 1, helper: "Closed periods protected from edits" },
      { label: "Audit events", value: 24, helper: "Recent posting and update activity" }
    ],
    queues: [
      { title: "Review suspense accounts", description: "Investigate balances in clearing or suspense accounts before close.", status: "Month end", href: "/chart-of-accounts" },
      { title: "Drill into source documents", description: "Trace ledger movement back to invoices, bills, payments, and journals.", status: "Audit trail", href: "/journal-entries" },
      { title: "Export ledger", description: "Export account movement for auditor or CA review.", status: "CSV/PDF", href: "/reports/trial-balance" }
    ],
    operatingRules: [
      "Every posted transaction must create balanced debit and credit movement.",
      "Ledger reports should be immutable for locked periods unless an override is logged.",
      "Manual journals must pass debit equals credit validation before posting."
    ],
    linkedFlows: [
      { title: "Chart of Accounts", description: "Maintain account master and balances.", href: "/chart-of-accounts" },
      { title: "Journal Entries", description: "Post manual and adjustment entries.", href: "/journal-entries" },
      { title: "Trial Balance", description: "Verify debits equal credits.", href: "/reports/trial-balance" }
    ]
  },
  "day-book": {
    title: "Day Book",
    description: "Daily chronological transaction book for sales, purchases, banking, expenses, and journals.",
    metrics: [
      { label: "Today transactions", value: 8, helper: "Operational postings today" },
      { label: "Drafts", value: 3, helper: "Not yet posted to books" },
      { label: "Exceptions", value: 1, helper: "Needs review before close" },
      { label: "Net cash movement", value: 5200, helper: "Receipts less payouts" }
    ],
    queues: [
      { title: "Review today's postings", description: "Check every posted transaction for account, tax, and period correctness.", status: "Daily close", href: "/journal-entries" },
      { title: "Resolve drafts", description: "Convert approved drafts or delete invalid transactions before day close.", status: "Control", href: "/invoices" },
      { title: "Confirm bank movement", description: "Match posted receipts and payments to bank statement lines.", status: "Reconciliation", href: "/bank-accounts" }
    ],
    operatingRules: [
      "The day book should include all source modules that create accounting impact.",
      "Backdated entries into locked periods should be blocked unless override logging is enabled.",
      "Daily close review should happen before GST and management reports are finalized."
    ],
    linkedFlows: [
      { title: "Invoices", description: "Sales transactions.", href: "/invoices" },
      { title: "Bills", description: "Purchase transactions.", href: "/bills" },
      { title: "Bank Accounts", description: "Cash and bank movement.", href: "/bank-accounts" }
    ]
  },
  "gst-command-center": {
    title: "GST Command Center",
    description: "India-first compliance cockpit for GST filing readiness, mismatch alerts, and return preparation.",
    metrics: [
      { label: "Filing readiness", value: "78%", helper: "Based on invoice tax completeness and mismatch checks" },
      { label: "GSTR-1 value", value: 232000, helper: "Outward taxable supplies under review" },
      { label: "ITC at risk", value: 4200, helper: "Input tax requiring 2B reconciliation" },
      { label: "Mismatch alerts", value: 3, helper: "GSTIN, POS, rate, or document issues" }
    ],
    queues: [
      { title: "Fix GSTIN and POS gaps", description: "Review customers/vendors without GST treatment, GSTIN, or state code.", status: "Master data", href: "/customers" },
      { title: "Review outward supplies", description: "Validate B2B/B2C classification, HSN/SAC, place of supply, and tax splits.", status: "GSTR-1", href: "/reports/gstr-1" },
      { title: "Reconcile ITC", description: "Compare supplier bills against GSTR-2B availability before claiming credit.", status: "ITC", href: "/itc-reconciliation" }
    ],
    operatingRules: [
      "GST output should be derived from posted invoices and credit notes only.",
      "Input tax credit should be claim-ready only after vendor GSTIN, tax rate, and 2B match checks pass.",
      "E-invoice and e-way bill readiness should preserve IRN, acknowledgement, transport, and distance metadata when enabled."
    ],
    linkedFlows: [
      { title: "GST Summary", description: "Tax payable and credit overview.", href: "/reports/gst-summary" },
      { title: "GSTR-1", description: "Outward supplies return view.", href: "/reports/gstr-1" },
      { title: "GSTR-3B", description: "Summary return view.", href: "/reports/gstr-3b" },
      { title: "GST Parity", description: "Mismatch and parity checks.", href: "/reports/gst-parity" }
    ]
  },
  "itc-reconciliation": {
    title: "GSTR-2B / ITC Reconciliation",
    description: "Track input tax credit readiness by matching vendor bills to supplier-filed GST data.",
    metrics: [
      { label: "Bills with GST", value: 2, helper: "Supplier tax invoices booked" },
      { label: "Matched ITC", value: 1180, helper: "Eligible input tax credit" },
      { label: "Unmatched ITC", value: 4200, helper: "Supplier filing or master mismatch" },
      { label: "Blocked vendors", value: 1, helper: "GSTIN or filing issue" }
    ],
    queues: [
      { title: "Upload 2B data", description: "Import supplier-filed purchase register from GST portal CSV or JSON.", status: "Import", href: "/imports/new" },
      { title: "Match vendor bills", description: "Compare GSTIN, invoice number, date, taxable value, and tax amount.", status: "Reconciliation", href: "/bills" },
      { title: "Hold risky ITC", description: "Exclude unmatched or disputed credit from filing-ready summary.", status: "Compliance", href: "/reports/gstr-3b" }
    ],
    operatingRules: [
      "ITC should be claimable only when supplier invoice, vendor GSTIN, and 2B data align.",
      "Reverse charge bills should route tax liability and credit according to RCM treatment.",
      "Mismatch resolution must leave an audit trail for CA review."
    ],
    linkedFlows: [
      { title: "Bills", description: "Booked supplier tax invoices.", href: "/bills" },
      { title: "Imports", description: "Upload 2B files and validation data.", href: "/imports" },
      { title: "GSTR-3B", description: "Finalize ITC claim summary.", href: "/reports/gstr-3b" }
    ]
  },
  warehouses: {
    title: "Warehouses",
    description: "Control stock locations, reorder alerts, and stock movement accountability.",
    metrics: [
      { label: "Locations", value: 2, helper: "Primary and virtual/service stock locations" },
      { label: "Low-stock items", value: 1, helper: "Below reorder point" },
      { label: "Transfers pending", value: 2, helper: "Awaiting dispatch or receipt confirmation" },
      { label: "Inventory value", value: 17100, helper: "Stock valuation estimate" }
    ],
    queues: [
      { title: "Review reorder alerts", description: "Raise purchase orders for items below reorder point.", status: "Procurement", href: "/purchase-orders/new" },
      { title: "Approve stock transfers", description: "Move inventory between warehouses with dispatch and receipt confirmation.", status: "Operations", href: "/stock-movements" },
      { title: "Adjust damaged stock", description: "Post stock adjustment with reason and valuation impact.", status: "Control", href: "/stock-movements" }
    ],
    operatingRules: [
      "Track-inventory items should reduce stock when sales are fulfilled, not when quotation is sent.",
      "Purchase receipt should increase quantity and inventory value only after GRN acceptance.",
      "Stock adjustments require reason, approver, and audit history."
    ],
    linkedFlows: [
      { title: "Inventory", description: "Item master and stock levels.", href: "/inventory" },
      { title: "Goods Receipt Notes", description: "Receive purchase orders into stock.", href: "/goods-receipts" },
      { title: "Purchase Orders", description: "Procure replenishment stock.", href: "/purchase-orders" }
    ]
  },
  "stock-movements": {
    title: "Stock Movements",
    description: "Audit stock adjustments, transfers, receipts, and sales-linked reductions.",
    metrics: [
      { label: "Movements this month", value: 18, helper: "Receipts, transfers, adjustments, and issues" },
      { label: "Unposted movements", value: 2, helper: "Need valuation review" },
      { label: "Adjustment value", value: 950, helper: "Manual stock impact" },
      { label: "Dispatch pending", value: 1, helper: "Sales order ready for delivery" }
    ],
    queues: [
      { title: "Post received stock", description: "Convert accepted GRNs into inventory movement and valuation entries.", status: "Receipt", href: "/goods-receipts" },
      { title: "Confirm dispatch", description: "Reduce stock when customer delivery/dispatch is confirmed.", status: "Sales", href: "/sales-orders" },
      { title: "Approve adjustments", description: "Review physical count variance before posting stock adjustment.", status: "Approval", href: "/approvals" }
    ],
    operatingRules: [
      "Stock movement quantity must tie to item, warehouse, source document, and movement type.",
      "Inventory valuation should be consistent with selected valuation method.",
      "Negative stock should be blocked unless explicitly permitted for the item/warehouse."
    ],
    linkedFlows: [
      { title: "Inventory", description: "Review on-hand stock.", href: "/inventory" },
      { title: "Sales Orders", description: "Fulfillment and dispatch source.", href: "/sales-orders" },
      { title: "Approvals", description: "Control manual adjustments.", href: "/approvals" }
    ]
  },
  documents: {
    title: "Document Center",
    description: "Central document control for invoices, bills, receipts, contracts, OCR files, and attachments.",
    metrics: [
      { label: "Documents indexed", value: 42, helper: "Attached to transactions and masters" },
      { label: "OCR review", value: 3, helper: "Parsed documents needing approval" },
      { label: "Missing attachments", value: 4, helper: "High-value records without support" },
      { label: "Duplicate risk", value: 1, helper: "Potential supplier bill duplicate" }
    ],
    queues: [
      { title: "Review OCR drafts", description: "Validate extracted vendor, date, GST, line items, and total before bill creation.", status: "OCR", href: "/ocr-bills" },
      { title: "Attach missing proof", description: "Add receipts or supplier invoices to records marked incomplete.", status: "Audit", href: "/expenses" },
      { title: "Resolve duplicates", description: "Compare vendor, invoice number, date, and amount to avoid double booking.", status: "Control", href: "/bills" }
    ],
    operatingRules: [
      "Major financial transactions should keep source document attachments for audit readiness.",
      "OCR-created bills must remain draft until reviewed by a user.",
      "Document storage paths should be tenant-scoped and never expose service-role keys to the browser."
    ],
    linkedFlows: [
      { title: "OCR Bills", description: "Review parsed supplier documents.", href: "/ocr-bills" },
      { title: "Bills", description: "Attach supplier invoices.", href: "/bills" },
      { title: "Expenses", description: "Attach receipts and proof.", href: "/expenses" }
    ]
  },
  "migration-center": {
    title: "Migration Center",
    description: "Move from Tally, Zoho Books, or CSV with mapping, validation, retry, and parity reports.",
    actionLabel: "New import",
    actionHref: "/imports/new",
    metrics: [
      { label: "Import jobs", value: 2, helper: "Recent Tally/Zoho/CSV runs" },
      { label: "Rows imported", value: 62, helper: "Accepted master and transaction rows" },
      { label: "Rows failed", value: 2, helper: "Need mapping or validation fixes" },
      { label: "Parity status", value: "Open", helper: "Trial balance and outstanding checks pending" }
    ],
    queues: [
      { title: "Map source columns", description: "Map Tally/Zoho fields to QuikFinance masters and transactions.", status: "Mapping", href: "/imports" },
      { title: "Fix validation errors", description: "Resolve missing GSTIN, account, tax, date, and currency mapping issues.", status: "Retry", href: "/imports" },
      { title: "Run parity reports", description: "Compare trial balance and customer/vendor outstanding with legacy system.", status: "Go-live", href: "/reports/trial-balance" }
    ],
    operatingRules: [
      "Opening balances should be posted through controlled journals and tie to the legacy trial balance.",
      "Migration retry should only process failed rows or corrected batches, never duplicate accepted rows.",
      "Cutover should require trial balance and outstanding parity sign-off."
    ],
    linkedFlows: [
      { title: "Imports", description: "Run CSV, Tally, Zoho, or bank statement imports.", href: "/imports" },
      { title: "Trial Balance", description: "Compare migrated account balances.", href: "/reports/trial-balance" },
      { title: "Outstanding Report", description: "Compare AR/AP open balances.", href: "/reports/outstanding" }
    ]
  },
  approvals: {
    title: "Approvals",
    description: "Maker-checker queue for bills, journals, stock adjustments, period overrides, and high-risk transactions.",
    metrics: [
      { label: "Pending approval", value: 6, helper: "Across AP, journals, stock, and overrides" },
      { label: "High risk", value: 2, helper: "Backdated or high-value records" },
      { label: "Rejected this month", value: 1, helper: "Returned for correction" },
      { label: "Average approval time", value: "3.4h", helper: "Operational turnaround" }
    ],
    queues: [
      { title: "Approve vendor bills", description: "Review supplier, GST, amount, and supporting document before posting.", status: "AP", href: "/bills" },
      { title: "Approve journals", description: "Check debit/credit balance and narration for manual entries.", status: "Accounting", href: "/journal-entries" },
      { title: "Approve overrides", description: "Review period lock override requests and required justification.", status: "Governance", href: "/period-locks" }
    ],
    operatingRules: [
      "Maker and checker should not be the same user for controlled workflows.",
      "Approvals must capture requester, approver, decision time, and comments.",
      "Rejected records should return to draft with reason visible to the maker."
    ],
    linkedFlows: [
      { title: "Bills", description: "Supplier invoice approval.", href: "/bills" },
      { title: "Journal Entries", description: "Manual posting approval.", href: "/journal-entries" },
      { title: "Period Locks", description: "Closed period controls.", href: "/period-locks" }
    ]
  },
  "audit-trail": {
    title: "Audit Trail",
    description: "Immutable activity history for master data, transactions, approvals, imports, and integration events.",
    metrics: [
      { label: "Events this month", value: 128, helper: "Creates, updates, posts, imports, and webhooks" },
      { label: "Override events", value: 1, helper: "Period lock or control bypasses" },
      { label: "Webhook events", value: 4, helper: "Razorpay payment/refund sync events" },
      { label: "Import events", value: 2, helper: "Migration and statement loads" }
    ],
    queues: [
      { title: "Review sensitive changes", description: "Monitor edits to bank, tax, user, and company settings.", status: "Governance", href: "/settings" },
      { title: "Inspect posting history", description: "Trace who created, approved, posted, or voided financial transactions.", status: "Audit", href: "/journal-entries" },
      { title: "Review integration events", description: "Check Razorpay webhook processing and failure history.", status: "Integrations", href: "/integrations" }
    ],
    operatingRules: [
      "Audit events should be append-only and tenant-scoped.",
      "Financial document numbers, posting status, and amount changes require explicit audit records.",
      "Webhook payloads should be stored for replay/debug while avoiding secret exposure."
    ],
    linkedFlows: [
      { title: "Integrations", description: "Gateway and connected service setup.", href: "/integrations" },
      { title: "Imports", description: "Data migration and retry history.", href: "/imports" },
      { title: "Settings", description: "Company and tax configuration changes.", href: "/settings" }
    ]
  },
  "payment-operations": {
    title: "QuikFinance Payments",
    description: "Razorpay collections, settlements, fee accounting, refunds, and webhook reconciliation.",
    metrics: [
      { label: "Payment links", value: 3, helper: "Created for open invoices" },
      { label: "Settlements pending", value: 2, helper: "Gateway settlement and fee posting" },
      { label: "Refunds pending sync", value: 1, helper: "Razorpay refund events to reconcile" },
      { label: "Gateway fees", value: 236, helper: "Fees to post against bank settlement" }
    ],
    queues: [
      { title: "Create collection links", description: "Generate Razorpay payment links from invoices with partial-payment control.", status: "Collections", href: "/invoices" },
      { title: "Reconcile settlements", description: "Match gateway payout, gross payments, fees, and refunds to bank transactions.", status: "Banking", href: "/bank-accounts" },
      { title: "Review webhooks", description: "Confirm payment, refund, and link status events processed successfully.", status: "Integration", href: "/integrations" }
    ],
    operatingRules: [
      "Payment capture reduces invoice balance only when provider event is verified or payment is manually posted.",
      "Gateway fees should debit payment gateway charges and credit settlement clearing.",
      "Refunds should reverse customer payment allocation and update invoice/customer balance."
    ],
    linkedFlows: [
      { title: "Invoices", description: "Generate payment links.", href: "/invoices" },
      { title: "Payments Received", description: "Review collected customer receipts.", href: "/payments/received" },
      { title: "Bank Reconciliation", description: "Match settlements to bank lines.", href: "/bank-accounts" }
    ]
  },
  "exception-queue": {
    title: "Exception Queue",
    description: "Operational alerts for missing data, reconciliation gaps, duplicates, and compliance blockers.",
    metrics: [
      { label: "Open exceptions", value: 14, helper: "Across accounting, GST, bank, and stock" },
      { label: "Critical", value: 3, helper: "Must resolve before close or filing" },
      { label: "Duplicates", value: 1, helper: "Potential duplicate bill/payment" },
      { label: "Auto-match suggestions", value: 7, helper: "Bank reconciliation candidates" }
    ],
    queues: [
      { title: "Resolve bank mismatches", description: "Review unmatched statement lines and auto-match suggestions.", status: "Banking", href: "/bank-accounts" },
      { title: "Fix GST blockers", description: "Complete GSTIN, POS, HSN/SAC, and tax treatment gaps.", status: "GST", href: "/gst-command-center" },
      { title: "Clear duplicate risks", description: "Investigate duplicate OCR bills, import rows, and payment references.", status: "Control", href: "/documents" }
    ],
    operatingRules: [
      "Exceptions should be assigned, aged, and closed with resolution notes.",
      "Critical filing blockers should prevent marking GST as filing-ready.",
      "Suggested matches should remain suggestions until reviewed or auto-match confidence is above policy threshold."
    ],
    linkedFlows: [
      { title: "Bank Accounts", description: "Reconciliation exceptions.", href: "/bank-accounts" },
      { title: "GST Command Center", description: "Compliance blockers.", href: "/gst-command-center" },
      { title: "Documents", description: "OCR and duplicate exceptions.", href: "/documents" }
    ]
  },
  "rules-engine": {
    title: "Rules Engine",
    description: "Automation control plane for reminders, exceptions, approval routing, and scheduled finance operations.",
    metrics: [
      { label: "Active rules", value: 4, helper: "Reminder, approval, GST, and reconciliation automations" },
      { label: "Runs today", value: 12, helper: "Scheduled and event-triggered evaluations" },
      { label: "Failed runs", value: 0, helper: "No failed automation actions" },
      { label: "Manual review", value: 3, helper: "Rules created exceptions for user review" }
    ],
    queues: [
      { title: "Configure overdue reminder rule", description: "Create receivable reminders based on due date, balance, and customer risk.", status: "Collections", href: "/collections" },
      { title: "Route approval rules", description: "Send high-value bills, journals, and stock adjustments to maker-checker approval.", status: "Governance", href: "/approvals" },
      { title: "Create exception rules", description: "Open exceptions for GST blockers, bank mismatches, and duplicate documents.", status: "Control", href: "/exception-queue" }
    ],
    operatingRules: [
      "Automation should create reviewable records; it should not silently post accounting entries.",
      "Rules must be tenant-scoped and auditable with last-run and action payload history.",
      "Critical finance actions should route to approvals rather than auto-approve."
    ],
    linkedFlows: [
      { title: "Exception Queue", description: "Review automation-generated exceptions.", href: "/exception-queue" },
      { title: "Approvals", description: "Review maker-checker routed records.", href: "/approvals" },
      { title: "Audit Trail", description: "Trace rule activity.", href: "/audit-trail" }
    ]
  },
  "close-management": {
    title: "Close Management",
    description: "Month-end close dashboard for reconciliation, GST, approvals, accruals, and period locks.",
    metrics: [
      { label: "Open close tasks", value: 8, helper: "Tasks remaining before period lock" },
      { label: "Blocked tasks", value: 2, helper: "Need approvals or reconciliation" },
      { label: "Ready to lock", value: "No", helper: "Resolve blockers first" },
      { label: "Close progress", value: "62%", helper: "Completed month-end checklist" }
    ],
    queues: [
      { title: "Complete bank reconciliation", description: "Ensure all bank accounts are reconciled through period end.", status: "Banking", href: "/bank-accounts" },
      { title: "Clear approval queue", description: "Approve or reject draft bills, journals, and overrides before locking.", status: "Approvals", href: "/approvals" },
      { title: "Lock closed period", description: "Activate period lock after reports and GST readiness are reviewed.", status: "Close", href: "/period-locks" }
    ],
    operatingRules: [
      "Close tasks should be role-owned and dated for accountability.",
      "Periods should not lock while critical exceptions remain open.",
      "Override requests after close must route through approval and audit logs."
    ],
    linkedFlows: [
      { title: "Period Locks", description: "Lock and protect closed periods.", href: "/period-locks" },
      { title: "Audit Trail", description: "Review close and override activity.", href: "/audit-trail" },
      { title: "Reports", description: "Finalize financial statements.", href: "/reports" }
    ]
  },
  "finance-copilot": {
    title: "Finance Copilot Insights",
    description: "Non-chat finance insight surface for anomalies, reminders, compliance blockers, and suggested actions.",
    metrics: [
      { label: "Open insights", value: 5, helper: "Suggestions waiting for review" },
      { label: "Critical", value: 1, helper: "High-impact finance issue" },
      { label: "Accepted this month", value: 3, helper: "Insights converted to actions" },
      { label: "Dismissed", value: 1, helper: "User rejected suggestions" }
    ],
    queues: [
      { title: "Review anomaly insights", description: "Inspect unusual expense, margin, and cash movement patterns.", status: "Anomaly", href: "/exception-queue" },
      { title: "Convert insights to tasks", description: "Create approvals, close tasks, or exceptions from reviewed insights.", status: "Action", href: "/approvals" },
      { title: "Track insight decisions", description: "Accepted and dismissed insights are retained for audit learning.", status: "Audit", href: "/audit-trail" }
    ],
    operatingRules: [
      "Copilot insights are recommendations, not automatic accounting postings.",
      "Insights should be explainable and link to source records.",
      "User decisions on insights should be stored for audit and future tuning."
    ],
    linkedFlows: [
      { title: "Exception Queue", description: "Convert insights into tracked exceptions.", href: "/exception-queue" },
      { title: "Rules Engine", description: "Automate repeated insight conditions.", href: "/rules-engine" },
      { title: "Audit Trail", description: "Track accepted/dismissed insights.", href: "/audit-trail" }
    ]
  }
};

export function getWorkflowPage(key: string) {
  const config = workflowPages[key];
  if (!config) {
    throw new Error(`Unknown workflow page: ${key}`);
  }
  return config;
}
