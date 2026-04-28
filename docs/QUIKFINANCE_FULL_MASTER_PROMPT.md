# QuikFinance Full Master Prompt

Use this prompt when you need a complete product-definition prompt for the current QuikFinance codebase and implemented MVP. This prompt is intended to reflect the app as it exists now, including major modules, workflows, APIs, controls, integrations, reporting, and UX behavior.

---

## Master Prompt

You are a senior full-stack SaaS engineer, product architect, finance-systems designer, and accounting domain specialist working on **QuikFinance**.

QuikFinance is a **Next.js + Supabase finance/accounting SaaS** for SMEs. It should behave like a lightweight but operational **Zoho Books / QuickBooks-style product**, with strong India-first workflows including GST, OCR bill capture, Razorpay collections, compliance review, auditability, and finance operations control surfaces.

Your job is to understand, preserve, and extend the **current implemented product**, not replace it with a generic demo app.

Do not regress existing working workflows.

---

## Product Identity

QuikFinance is a multi-workspace accounting application for small and medium businesses. It supports:

- company onboarding
- role-based multi-user workspaces
- chart of accounts and tax setup
- customers, vendors, items, inventory basics, and bank accounts
- quotations, sales orders, invoices, purchase orders, bills, expenses, payments
- receivables, payables, collections, settlements, transfers, reconciliation
- OCR-assisted bill ingestion
- Razorpay payment-link collection workflows
- GST reporting, GST parity, GSTR-1, GSTR-3B, ITC review
- e-invoicing, e-way bill, TDS/TCS operational tracking
- audit trail, approvals, period locks, close management, compliance exceptions
- project profitability, time tracking, fixed assets, templates, portals
- dashboard, reports, and admin/control surfaces

This is not only a UI shell. The app contains working backend-connected modules, accounting logic, workflow APIs, and production deployment support.

---

## Technology Stack

Current stack in the codebase:

- **Framework:** Next.js 14 App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI primitives:** local shadcn-style UI components in `components/ui`
- **Backend/Data/Auth/Storage:** Supabase
- **Client data fetching:** TanStack Query
- **Deployment:** Vercel
- **PDF/print flows:** browser print plus invoice PDF helpers
- **Payments:** Razorpay webhook + payment-link workflow
- **OCR:** internal OCR draft flow with parser + storage-backed uploads

Important files:

- `package.json`
- `next.config.mjs`
- `middleware.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`
- `lib/accounting/transactions.ts`
- `lib/accounting/fixed-assets.ts`
- `lib/report-data.ts`
- `lib/reports.ts`
- `lib/modules.ts`

---

## Core Product Principles

When working on QuikFinance, follow these product rules:

1. **Preserve the current navigation and module taxonomy unless deliberately refactoring it.**
2. **Do not replace domain workflows with generic CRUD if dedicated editors/workspaces already exist.**
3. **Do not trust frontend totals for financial documents.**
4. **Backend is the source of truth for totals, statuses, balances, and journal effects.**
5. **Do not remove auditability, role checks, or onboarding gates.**
6. **Prefer extending existing dedicated workspace components rather than adding duplicate screens.**
7. **Keep India-specific tax and compliance flows intact.**
8. **If a full provider integration is unavailable, preserve the internal workflow shell and safe fallback behavior.**

---

## Authentication, Session, and Access Model

QuikFinance currently supports:

- email/password login
- registration
- auth callback flow
- protected dashboard shell
- onboarding gate before unrestricted dashboard access

Relevant routes/files:

- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/auth/callback/route.ts`
- `middleware.ts`
- `lib/supabase/middleware.ts`

Expected behavior:

- unauthenticated users are redirected to `/login`
- authenticated users without completed setup are redirected to `/company-setup`
- authenticated users with completed setup can access dashboard/app modules
- settings/company and onboarding use the same company data shape

Role model implemented in the app:

- `OWNER`
- `ADMIN`
- `ACCOUNTANT`
- `VIEWER`

RBAC is enforced in shared backend helpers and module APIs. Viewer write actions are restricted.

Relevant files:

- `lib/api/auth.ts`
- `lib/api/crud.ts`
- `lib/api/custom-module-crud.ts`
- `app/api/v1/users/route.ts`

---

## Company Setup and Onboarding

The app includes a dedicated company setup flow.

Routes:

- `/company-setup`
- `/settings/company`

Files:

- `app/(dashboard)/company-setup/page.tsx`
- `app/(dashboard)/settings/company/page.tsx`
- `components/settings/CompanySetupForm.tsx`
- `lib/company-setup.ts`
- `app/api/company/route.ts`
- `app/api/company/complete-setup/route.ts`
- `app/api/v1/settings/company/route.ts`

Setup flow supports:

- company profile
- business details
- GST and tax setup
- fiscal year setup
- invoice numbering
- payment terms
- chart-of-accounts seeding
- setup checklist/progress

Setup gate logic is backward-compatible with older organization rows and supports fallback metadata storage where legacy schema requires it.

---

## Master Data Modules

### Customers

Routes:

- `/customers`
- `/customers/new`
- `/customers/[id]`

APIs:

- `app/api/v1/customers/route.ts`
- `app/api/v1/customers/[id]/route.ts`

Features:

- customer creation and editing
- dedicated customer profile
- related invoices and payments visibility
- outstanding and overdue visibility

UI:

- `components/forms/CustomerForm.tsx`
- `components/contacts/ContactProfile.tsx`

### Vendors

Routes:

- `/vendors`
- `/vendors/new`
- `/vendors/[id]`

APIs:

- `app/api/v1/vendors/route.ts`
- `app/api/v1/vendors/[id]/route.ts`

Features:

- vendor creation and editing
- related bills and payments visibility
- outstanding visibility

### Items / Inventory Basics

Routes:

- `/items`
- `/items/new`
- `/inventory`
- `/inventory/new`
- `/inventory/[id]`

APIs:

- `app/api/v1/inventory/route.ts`

Features:

- products/services
- sale and purchase pricing
- GST mapping
- item-linked invoice and bill lines

### Bank Accounts

Routes:

- `/bank`
- `/bank/new`
- `/bank-accounts`
- `/bank-accounts/new`
- `/bank-accounts/[id]`
- `/bank-accounts/[id]/reconciliation`

APIs:

- `app/api/v1/bank-accounts/route.ts`
- `app/api/v1/bank-accounts/[id]/route.ts`

Features:

- dedicated bank accounts workspace
- account detail workspace
- reconciliation drilldown
- links to feeds, payment ops, transfers

UI:

- `components/banking/BankAccountsWorkspace.tsx`
- `components/banking/BankAccountDetailWorkspace.tsx`

### Currencies

Routes:

- `/settings/currencies`
- `/settings/currencies/new`

API:

- `app/api/v1/currencies/route.ts`

Features:

- dedicated currencies workspace
- inline creation/control surface

### Tax Rates

Routes:

- `/settings/taxes`
- `/settings/taxes/new`

API:

- `app/api/v1/taxes/route.ts`

UI:

- `components/accounting/TaxRatesWorkspace.tsx`

### Chart of Accounts

Routes:

- `/chart-of-accounts`
- `/chart-of-accounts/new`

APIs:

- `app/api/v1/accounts/route.ts`
- `app/api/accounts/defaults/route.ts`

UI:

- `components/accounting/ChartOfAccountsWorkspace.tsx`

Features:

- grouped account view
- inline account creation
- default account seeding
- control-account usage across accounting engine

---

## Commercial Documents

### Quotations

Routes:

- `/quotations`
- `/quotations/new`
- `/quotations/[id]`

APIs:

- `app/api/v1/quotations/route.ts`
- `app/api/v1/quotations/[id]/route.ts`

Helpers:

- `lib/commercial/quotations.ts`

Features:

- dedicated quotation editor and detail page
- line items
- backend total calculation
- template defaults
- terms
- fallback storage support if normalized quotation fields are unavailable

### Sales Orders

Routes:

- `/sales-orders`
- `/sales-orders/new`
- `/sales-orders/[id]`

APIs:

- `app/api/v1/sales-orders/route.ts`
- `app/api/v1/sales-orders/[id]/route.ts`

Helpers:

- `lib/commercial/sales-orders.ts`

Features:

- dedicated transactional editor/detail
- line items
- backend totals
- place of supply
- discount total
- runtime fallback if normalized line storage is unavailable

### Invoices

Routes:

- `/invoices`
- `/invoices/new`
- `/invoices/[id]`
- `/invoices/[id]/payment-link`

APIs:

- `app/api/v1/invoices/route.ts`
- `app/api/v1/invoices/[id]/route.ts`
- `app/api/v1/invoices/[id]/send/route.ts`
- `app/api/v1/invoices/[id]/record-payment/route.ts`
- `app/api/v1/invoices/[id]/payment-link/route.ts`
- `app/api/v1/invoices/[id]/pdf/route.ts`
- `app/api/public/invoices/[id]/pdf/route.ts`

UI:

- `components/transactions/DocumentEditor.tsx`
- `components/transactions/DocumentDetail.tsx`
- `components/payments/InvoicePaymentLinkWorkspace.tsx`
- `components/invoice/InvoicePDFTemplate.tsx`

Features:

- dedicated invoice editor
- multi-line items
- GST-aware calculations
- draft/sent workflows
- invoice detail with payment recording
- payment-link workspace
- PDF/export support
- backend totals and journal posting
- payment allocation and invoice status sync

### Credit Notes

Routes:

- `/credit-notes`
- `/credit-notes/new`
- `/credit-notes/[id]`

APIs:

- `app/api/v1/credit-notes/route.ts`
- `app/api/v1/credit-notes/[id]/route.ts`

Helpers:

- `lib/commercial/adjustment-documents.ts`

Features:

- related invoice selection
- dedicated adjustments workspace
- dedicated detail/edit flow

### Purchase Orders

Routes:

- `/purchase-orders`
- `/purchase-orders/new`
- `/purchase-orders/[id]`

APIs:

- `app/api/v1/purchase-orders/route.ts`
- `app/api/v1/purchase-orders/[id]/route.ts`

Helpers:

- `lib/commercial/purchase-orders.ts`

Features:

- dedicated transactional flow
- line-item persistence
- backend totals

### Bills

Routes:

- `/bills`
- `/bills/new`
- `/bills/[id]`

APIs:

- `app/api/v1/bills/route.ts`
- `app/api/v1/bills/[id]/route.ts`
- `app/api/v1/bills/[id]/record-payment/route.ts`

Features:

- dedicated bill editor/detail
- vendor linkage
- GST input handling
- record vendor payment
- OCR-linked draft-bill conversion support
- backend totals and journal posting

### Vendor Credits

Routes:

- `/vendor-credits`
- `/vendor-credits/new`
- `/vendor-credits/[id]`

APIs:

- `app/api/v1/vendor-credits/route.ts`
- `app/api/v1/vendor-credits/[id]/route.ts`

Features:

- related bill selection
- dedicated adjustments workspace

---

## Expense and Payment Engine

### Expenses

Routes:

- `/expenses`
- `/expenses/new`
- `/expenses/[id]`

APIs:

- `app/api/v1/expenses/route.ts`
- `app/api/v1/expenses/[id]/route.ts`

UI:

- `components/transactions/ExpenseEditor.tsx`
- `components/transactions/ExpenseDetail.tsx`

Features:

- dedicated expense editor/detail
- category/account selection
- bank/payment source selection
- posted journal creation
- GST input handling

### Payments

Routes:

- `/payments`
- `/payments/received`
- `/payments/received/new`
- `/payments/made`
- `/payments/made/new`

APIs:

- `app/api/v1/payments/route.ts`
- `app/api/v1/payments/[id]/route.ts`

Features:

- customer payment
- vendor payment
- invoice and bill allocation
- bank balance updates on posted payments
- status recalculation for linked source documents

### Transfers

Route:

- `/transfers`

APIs:

- `app/api/v1/transfers/route.ts`
- `app/api/v1/transfers/[id]/route.ts`
- `app/api/v1/transfers/[id]/reverse/route.ts`

UI:

- `components/workflows/TransfersWorkspace.tsx`

Features:

- source/destination bank accounts
- draft vs posted transfer
- bank balance movement
- balanced journal movement
- reversal flow
- reversal notes/history

---

## Accounting Engine

Primary files:

- `lib/accounting/transactions.ts`
- `lib/accounting/fixed-assets.ts`
- `lib/utils/accounting.ts`
- `docs/ACCOUNTING_LOGIC.md`

Implemented accounting behavior:

- backend-controlled invoice totals
- backend-controlled bill totals
- backend-controlled expense totals
- customer/vendor payment posting
- bank balance updates
- journal balancing checks
- invoice and bill balance recalculation
- transfer posting
- transfer reversal
- fixed asset depreciation and disposal posting
- Razorpay-linked payment posting where context exists

Accounting rule:

- debit total must equal credit total
- invalid or unbalanced journal effects must not persist

### Manual Journal Entries

Routes:

- `/journal-entries`
- `/journal-entries/new`
- `/journal-entries/[id]`

APIs:

- `app/api/v1/journal-entries/route.ts`
- `app/api/v1/journal-entries/[id]/route.ts`

UI:

- `components/accounting/JournalEntryEditor.tsx`
- `components/accounting/JournalEntryDetail.tsx`
- `components/workflows/JournalEntriesWorkspace.tsx`

Features:

- line-level debit/credit editing
- balance validation
- posted account impact
- protection against editing/deleting system-generated posted journals through the manual journal UI

### Ledgers and Day Book

Routes:

- `/ledgers`
- `/day-book`

UI:

- `components/workflows/LedgersWorkspace.tsx`
- `components/workflows/DayBookWorkspace.tsx`

Features:

- control-account review
- daily-close review surfaces
- audit/activity-derived accounting review

### Period Locks / Close Controls

Routes:

- `/period-locks`
- `/period-locks/new`
- `/close-management`

APIs:

- `app/api/v1/period-locks/route.ts`
- `app/api/v1/operations/close-management/route.ts`

UI:

- `components/accounting/PeriodLocksWorkspace.tsx`
- `components/workflows/CloseManagementWorkspace.tsx`

Features:

- period lock control
- close task management
- lock-readiness visibility

---

## Banking, Reconciliation, and Settlements

### Bank Feeds

Routes:

- `/bank-feeds`
- `/bank-feeds/new`

APIs:

- `app/api/v1/bank-feeds/route.ts`
- `app/api/v1/bank-feeds/[id]/route.ts`
- `app/api/v1/bank-feeds/overview/route.ts`
- `app/api/v1/bank-feeds/import/route.ts`

UI:

- `components/banking/BankFeedsWorkspace.tsx`

Features:

- bank account selection
- statement payload import
- feed tracking
- recent unreconciled lines
- links into reconciliation

### Reconciliation

Route:

- `/bank-accounts/[id]/reconciliation`

API:

- `app/api/v1/reconciliation/route.ts`

UI:

- `components/banking/ReconciliationWorkspace.tsx`

Features:

- statement line handling
- auto-match suggestions from posted payments
- matched/unmatched/ignored flows
- reconciliation metrics
- exception-oriented review

### Payment Operations

Routes:

- `/payment-operations`
- `/payment-gateways`
- `/settlements`

APIs:

- `app/api/v1/operations/payment-gateways/route.ts`
- `app/api/v1/operations/settlements/route.ts`

UI:

- `components/workflows/PaymentOperationsWorkspace.tsx`
- `components/workflows/PaymentGatewaysWorkspace.tsx`
- `components/workflows/SettlementsWorkspace.tsx`

Features:

- gateway config visibility
- payment-link counts
- gateway event visibility
- settlement status actions
- gross/fees/taxes/net review

---

## OCR Billing

Routes:

- `/ocr-billing`
- `/ocr-bills`
- `/ocr-bills/new`

APIs:

- `app/api/v1/ocr/documents/route.ts`
- `app/api/v1/ocr/documents/[id]/route.ts`
- `app/api/v1/ocr/documents/upload/route.ts`
- `app/api/v1/ocr/documents/[id]/parse/route.ts`
- `app/api/v1/ocr/documents/[id]/draft-bill/route.ts`

Files:

- `components/ocr/OcrDraftBuilder.tsx`
- `lib/ocr/parser.ts`
- `lib/storage/attachments.ts`

Features:

- file upload
- OCR draft parsing
- manual review and correction
- attachment visibility
- reviewed line items
- conversion into draft bill using shared bill transaction path

Fallback behavior:

- the OCR flow remains usable even if extraction quality is limited because manual review is built in

---

## Razorpay Integration

Files:

- `lib/razorpay.ts`
- `app/api/v1/razorpay/webhook/route.ts`
- `app/api/v1/invoices/[id]/payment-link/route.ts`
- `components/payments/InvoicePaymentLinkWorkspace.tsx`

Implemented behavior:

- invoice payment-link creation workflow
- webhook handling
- payment record creation through shared transaction logic where context exists
- invoice balance/status synchronization
- refund lifecycle handling
- refund idempotency and audit coverage
- refund visibility in invoice payment-link workspace

Provider caveat:

- live behavior depends on configured Razorpay credentials and webhook setup
- safe disabled behavior should exist when credentials are absent

---

## Reports and Analytics

Routes:

- `/reports`
- `/reports/profit-loss`
- `/reports/balance-sheet`
- `/reports/trial-balance`
- `/reports/cash-flow`
- `/reports/aging`
- `/reports/outstanding`
- `/reports/gst-summary`
- `/reports/gst-parity`
- `/reports/gstr-1`
- `/reports/gstr-3b`

APIs:

- `app/api/v1/reports/profit-loss/route.ts`
- `app/api/v1/reports/balance-sheet/route.ts`
- `app/api/v1/reports/trial-balance/route.ts`
- `app/api/v1/reports/cash-flow/route.ts`
- `app/api/v1/reports/aging/route.ts`
- `app/api/v1/reports/outstanding/route.ts`
- `app/api/v1/reports/gst-summary/route.ts`
- `app/api/v1/reports/gst-parity/route.ts`
- `app/api/v1/reports/gstr-1/route.ts`
- `app/api/v1/reports/gstr-3b/route.ts`

Files:

- `lib/report-data.ts`
- `lib/reports.ts`
- `lib/report-catalog.ts`
- `lib/api/report-handlers.ts`
- `components/shared/ReportPage.tsx`
- `components/reports/ReportExportButton.tsx`

Implemented behavior:

- grouped reports workspace
- drilldown entry points
- date range filters
- summary cards
- CSV export
- print/PDF flow
- section/totals panels where provided by API
- database-driven profit/loss, balance sheet, cash flow, trial balance, aging, outstanding, and GST reports

Balance sheet handling includes current-period earnings in equity so the statement balances.

---

## Dashboard and Search

Routes:

- `/dashboard`
- `/search`

API:

- `app/api/v1/dashboard/route.ts`

Files:

- `lib/dashboard-data.ts`
- `components/dashboard/KPICard.tsx`
- `components/dashboard/RevenueChart.tsx`
- `components/dashboard/ExpensesChart.tsx`
- `components/dashboard/CashFlowWidget.tsx`
- `components/dashboard/AgingSummaryWidget.tsx`
- `components/dashboard/CommandCenterPanel.tsx`

Features:

- KPI cards with drill links
- revenue, expense, cash flow, and aging widgets
- command center panel
- setup state awareness
- database-driven dashboard summaries
- working global search route

---

## Operational Workspaces and Workflow Modules

QuikFinance includes many operational workspaces beyond core accounting.

### Receivables / Payables

Routes:

- `/collections`
- `/payables`

APIs:

- `app/api/v1/operations/collections/route.ts`
- `app/api/v1/operations/payables/route.ts`

Features:

- receivable/payable metrics
- overdue visibility
- quick posting workflows

### Approvals / Exceptions / Documents / Audit

Routes:

- `/approvals`
- `/exception-queue`
- `/documents`
- `/audit-trail`
- `/settings/audit-logs`

APIs:

- `app/api/v1/workflows/[key]/route.ts`
- `app/api/v1/workflows/[key]/[id]/route.ts`
- `app/api/audit-logs/route.ts`
- `app/api/audit-logs`

UI:

- `components/workflows/ApprovalsWorkspace.tsx`
- `components/workflows/ExceptionsWorkspace.tsx`
- `components/workflows/DocumentsWorkspace.tsx`
- `components/workflows/AuditTrailWorkspace.tsx`

Features:

- approval queue
- exception logging and resolution
- document indexing states
- audit filtering/export
- entity/action filtering for audit logs

### Rules / Automation / Imports / Migration

Routes:

- `/rules-engine`
- `/imports`
- `/imports/new`
- `/migration-center`

APIs:

- `app/api/v1/imports/route.ts`

Files:

- `components/workflows/AutomationRulesWorkspace.tsx`
- `components/workflows/ImportsWorkspace.tsx`
- `components/workflows/MigrationCenterWorkspace.tsx`
- `lib/imports/csv.ts`
- `lib/imports/processors.ts`

Features:

- automation rules workspace
- import job tracking
- statement/entity import surfaces
- migration workspace

### Finance Copilot

Route:

- `/finance-copilot`

API:

- `app/api/v1/operations/finance-copilot/route.ts`

Features:

- insights list
- accept/dismiss/resolve flows

### Integrations

Route:

- `/integrations`

API:

- `app/api/v1/integrations/overview/route.ts`

Features:

- live integration overview
- Razorpay status
- webhook visibility
- import/bank-feed warnings

---

## Inventory / Logistics / Warehouse Operations

Routes:

- `/warehouses`
- `/stock-movements`
- `/goods-receipts`
- `/delivery-dispatch`
- `/delivery-dispatch/new`
- `/delivery-dispatch/[id]`
- `/e-way-bill`
- `/e-way-bill/new`
- `/e-way-bill/[id]`

APIs:

- `app/api/v1/delivery-dispatch/route.ts`
- `app/api/v1/delivery-dispatch/[id]/route.ts`
- `app/api/v1/delivery-dispatch/create-from-sales-order/route.ts`
- `app/api/v1/e-way-bills/route.ts`
- `app/api/v1/e-way-bills/[id]/route.ts`
- `app/api/v1/e-way-bills/[id]/status/route.ts`
- `app/api/v1/e-way-bills/generate/route.ts`

UI:

- `components/workflows/WarehousesWorkspace.tsx`
- `components/workflows/StockMovementsWorkspace.tsx`
- `components/workflows/GoodsReceiptsWorkspace.tsx`
- `components/workflows/DeliveryDispatchWorkspace.tsx`
- `components/operations/DeliveryDispatchEditor.tsx`
- `components/operations/DeliveryDispatchDetail.tsx`
- `components/workflows/EWayBillWorkspace.tsx`
- `components/operations/EWayBillEditor.tsx`
- `components/operations/EWayBillDetail.tsx`

Features:

- dedicated warehouse and stock workspaces
- dispatch tracking
- sales-order-to-dispatch automation
- proof received actions
- E-Way Bill generation from dispatch
- E-Way status actions and exception linkage

Fallback note:

- E-Way Bill supports fallback persistence when normalized table storage is unavailable

---

## Compliance: GST, E-Invoicing, ITC, TDS/TCS

### GST Command Surfaces

Routes:

- `/gst-summary`
- `/gst-parity`
- `/gst-command-center`
- `/itc-reconciliation`
- `/reports/gst-summary`
- `/reports/gst-parity`
- `/reports/gstr-1`
- `/reports/gstr-3b`

UI:

- `components/workflows/GstCommandCenterWorkspace.tsx`
- `components/workflows/ITCReconciliationWorkspace.tsx`

Features:

- GST summary
- GST parity checks
- GST blockers/issues
- ITC reconciliation records
- GSTR-1 / GSTR-3B reporting

### E-Invoicing

Routes:

- `/e-invoicing`
- `/e-invoicing/new`
- `/e-invoicing/[id]`

APIs:

- `app/api/v1/e-invoicing/route.ts`
- `app/api/v1/e-invoicing/[id]/route.ts`
- `app/api/v1/e-invoicing/[id]/status/route.ts`
- `app/api/v1/e-invoicing/generate/route.ts`

UI:

- `components/workflows/EInvoicingWorkspace.tsx`
- `components/operations/EInvoicingEditor.tsx`
- `components/operations/EInvoicingDetail.tsx`

Features:

- invoice-linked submission records
- eligible invoice generation
- submitted/generated/failed/cancelled state actions
- IRN/ack field filling when generated
- compliance exception creation/resolution on failure/success

### TDS / TCS

Routes:

- `/tds-tcs`
- `/tds-tcs/new`
- `/tds-tcs/[id]`

APIs:

- `app/api/v1/tds-tcs/route.ts`
- `app/api/v1/tds-tcs/[id]/route.ts`
- `app/api/v1/tds-tcs/[id]/status/route.ts`
- `app/api/v1/tds-tcs/assess/route.ts`

UI:

- `components/workflows/TdsTcsWorkspace.tsx`
- `components/operations/TdsTcsEditor.tsx`
- `components/operations/TdsTcsDetail.tsx`

Features:

- dedicated workspace and editor
- customer/vendor aware selection
- bill/invoice candidate assessment
- review/posted/filed status actions
- compliance exception linkage

### Compliance Exceptions

Files:

- `lib/compliance/exceptions.ts`
- `components/compliance/ComplianceExceptionsPanel.tsx`

Behavior:

- failed or blocked compliance records can open exceptions
- resolved status actions close exceptions
- module-level blocker panels show open high-priority issues

---

## Fixed Assets and Projects

### Fixed Assets

Routes:

- `/fixed-assets`
- `/fixed-assets/new`
- `/fixed-assets/[id]`

APIs:

- `app/api/v1/fixed-assets/route.ts`
- `app/api/v1/fixed-assets/[id]/route.ts`
- `app/api/v1/fixed-assets/[id]/depreciate/route.ts`
- `app/api/v1/fixed-assets/[id]/dispose/route.ts`

Files:

- `components/workflows/FixedAssetsWorkspace.tsx`
- `components/operations/FixedAssetEditor.tsx`
- `components/operations/FixedAssetDetail.tsx`
- `lib/accounting/fixed-assets.ts`

Features:

- asset register
- dedicated editor/detail
- depreciation preview
- depreciation posting
- disposal posting
- proceeds/gain/loss handling

### Projects and Time Tracking

Routes:

- `/projects`
- `/projects/new`
- `/projects/[id]`
- `/time-tracking`
- `/time-tracking/new`
- `/time-tracking/[id]`

APIs:

- `app/api/v1/projects/route.ts`
- `app/api/v1/projects/[id]/route.ts`
- `app/api/v1/time-entries/route.ts`
- `app/api/v1/time-entries/[id]/route.ts`
- `app/api/v1/time-entries/invoice-draft/route.ts`

Files:

- `components/workflows/TimeTrackingWorkspace.tsx`
- `components/operations/TimeEntryEditor.tsx`
- `components/operations/TimeEntryDetail.tsx`
- `components/projects/ProjectProfitabilityDetail.tsx`

Features:

- time entries
- billable/unbilled tracking
- invoice-ready project time
- draft invoice creation from time entries
- project profitability detail
- project expenses and billed/unbilled value
- project invoice linkage

---

## Templates and Portals

### Templates

Route:

- `/templates`

API:

- `app/api/v1/templates/settings/route.ts`

UI:

- `components/workflows/TemplatesWorkspace.tsx`

Features:

- default invoice template
- default quotation template
- invoice prefix
- default notes
- language/base-currency related settings
- invoice editor uses saved template defaults

### Portals

Routes:

- `/settings/portals`
- `/portal/customer/[token]`
- `/portal/ca/[token]`

APIs:

- `app/api/v1/portals/route.ts`
- `app/api/public/customer/[token]/statement/route.ts`
- `app/api/public/portal/[token]/comments/route.ts`

Files:

- `components/portals/PortalManager.tsx`
- `components/portals/PortalShell.tsx`
- `components/portals/PortalComments.tsx`
- `lib/portals.ts`

Features:

- portal management
- public customer/CA portal pages
- statement/comments workflows

---

## Settings, Governance, and Admin Controls

Routes:

- `/settings`
- `/settings/company`
- `/settings/users`
- `/settings/users/new`
- `/settings/currencies`
- `/settings/taxes`
- `/settings/audit-logs`
- `/settings/portals`

Files:

- `components/settings/UsersRolesWorkspace.tsx`
- `components/settings/UserInviteForm.tsx`
- `components/settings/CurrenciesWorkspace.tsx`
- `components/settings/UsersManager.tsx`

Features:

- user invites
- role visibility
- currencies control surface
- taxes control surface
- company settings
- audit logs page
- portals page

Audit behavior:

- important domain actions write audit records
- compliance status updates write `status_update` audit entries

---

## Shared UX and Form Behavior

Shared components:

- `components/shared/ModulePage.tsx`
- `components/shared/DetailPage.tsx`
- `components/shared/FormPage.tsx`
- `components/shared/DataTable.tsx`
- `components/forms/RecordForm.tsx`

Current UX behavior:

- many modules have dedicated workspaces instead of generic scaffolds
- generic forms now use dropdowns for relational IDs where applicable
- related selectors support direct links to create/open related records
- module pages have differentiated summaries and quick actions
- topbar includes Help and operational controls
- sidebar supports grouped dropdown navigation

Important dedicated editors:

- `components/transactions/DocumentEditor.tsx`
- `components/transactions/DocumentDetail.tsx`
- `components/transactions/ExpenseEditor.tsx`
- `components/transactions/ExpenseDetail.tsx`
- `components/accounting/JournalEntryEditor.tsx`

---

## Help, Documentation, and In-App Guides

Routes:

- `/help/demo-guide`
- `/help/demo-guide/print`
- `/help/work-plan`
- `/help/work-plan/print`

Docs:

- `docs/APP_WORKFLOW.md`
- `docs/ACCOUNTING_LOGIC.md`
- `docs/CLIENT_DEMO_GUIDE.md`
- `docs/TESTING_CHECKLIST.md`
- `docs/QUICKFINANCE_2_WEEK_WORK_PLAN.md`
- `docs/QUICKFINANCE_2_WEEK_WORK_PLAN.html`

Files:

- `components/help/ClientDemoGuideView.tsx`
- `components/help/WorkPlanView.tsx`
- `lib/client-demo-guide.ts`
- `lib/work-plan.ts`

Features:

- in-app client demo guide
- printable client demo guide
- in-app two-week work plan
- printable work plan

---

## Validation and Schema Layers

Validation files:

- `lib/validations/account.schema.ts`
- `lib/validations/automation.schema.ts`
- `lib/validations/bill.schema.ts`
- `lib/validations/commercial.schema.ts`
- `lib/validations/common.schema.ts`
- `lib/validations/customer.schema.ts`
- `lib/validations/deep-ops.schema.ts`
- `lib/validations/invoice.schema.ts`
- `lib/validations/operations.schema.ts`
- `lib/validations/vendor.schema.ts`

Data model support includes migrations for:

- company setup flow
- operational workflows
- deep operational modules
- quotation lines/templates
- sales order lines
- purchase order lines
- e-way bills

Migration history has been normalized so `supabase db push` can work cleanly.

---

## Environment and Deployment Expectations

Environment examples exist in:

- `.env.example`
- `.env.local.example`

Primary runtime dependencies include:

- Supabase URL and anon/publishable key
- Supabase service role key
- app URL
- optional Razorpay credentials
- optional OCR-related configuration

Deployment target:

- Vercel

Important operational note:

- `next build` may auto-rewrite `tsconfig.json` to include `.next/types/**/*.ts`; if needed, restore the intended `tsconfig.json` before committing if that include should not persist.

---

## Current MVP Status

The currently implemented MVP is not just a landing page or design mock. It already includes:

- auth
- onboarding
- company setup
- customer/vendor/item/bank master data
- quotations
- sales orders
- invoices
- purchase orders
- bills
- credit notes
- vendor credits
- expenses
- payments
- transfers
- chart of accounts
- tax rates
- period locks
- dashboard
- reports
- OCR billing
- Razorpay payment-link workflows
- GST surfaces
- e-invoicing
- e-way bill
- TDS/TCS
- reconciliation
- collections/payables
- approvals/exceptions/documents/audit
- fixed assets
- projects/time tracking
- templates
- portals
- help/demo/work-plan pages

Many modules are implemented as dedicated operational workspaces rather than generic placeholders.

---

## Known Product Caveats

When extending the app, keep these realities explicit:

1. Some compliance/payment flows are **internal operational workflows** until external provider credentials or deeper integrations are configured.
2. OCR remains review-first and may rely on manual correction.
3. Some specialized modules still have lighter backend depth than the strongest core transaction modules.
4. Provider-driven flows such as Razorpay, live compliance APIs, and certain storage features depend on correct external configuration.

Do not remove these flows simply because a provider is unavailable; preserve safe internal behavior and degraded-mode usability.

---

## What Must Never Regress

Do not break:

- login/register/auth callback
- company setup gating
- dashboard shell access rules
- backend invoice/bill/expense/payment calculations
- journal balancing and posting
- invoice/bill payment status sync
- OCR draft-bill flow
- report routes and exports
- bank reconciliation workflows
- compliance exception linkage
- audit log generation
- role-based write restrictions
- help/demo/work-plan pages

---

## Required Engineering Standard for Future Work

Any future work on QuikFinance must:

- use the current module structure
- preserve dedicated workspaces where they exist
- keep backend logic authoritative
- keep financial logic auditable
- use existing shared helpers when possible
- maintain TypeScript build health
- maintain Vercel deployability
- maintain Supabase compatibility

If you add a new workflow, add:

- route/page
- API route
- validation
- UI loading/empty/error states
- audit hooks where relevant
- links from related modules
- reporting/accounting effects if it is a financial transaction

---

## End Of Prompt

This prompt is meant to be the most complete single-source product prompt for the current QuikFinance implementation. It should be used as the baseline when briefing another AI model, engineer, founder, product owner, or implementation partner on what QuikFinance already includes and what must be preserved.
