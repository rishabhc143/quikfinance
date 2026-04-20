export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableShape<Row extends Record<string, unknown>, Insert extends Record<string, unknown>, Update extends Record<string, unknown>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type TenantRow = {
  id: string;
  org_id: string;
  created_at: string;
  updated_at?: string | null;
};

export type ContactRow = TenantRow & {
  type: "customer" | "vendor" | "both";
  display_name: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  tax_id: string | null;
  currency: string;
  payment_terms: number;
  credit_limit: number | null;
  billing_address: Json;
  shipping_address: Json;
  notes: string | null;
  is_active: boolean;
};

export type DocumentRow = TenantRow & {
  contact_id: string;
  status: string;
  currency: string;
  exchange_rate: number;
  issue_date: string;
  due_date: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  balance_due: number;
  notes: string | null;
};

export type InvoiceRow = DocumentRow & {
  invoice_number: string;
};

export type BillRow = DocumentRow & {
  bill_number: string;
};

export type PaymentRow = TenantRow & {
  contact_id: string | null;
  payment_type: "received" | "made";
  payment_date: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  method: string;
  reference: string | null;
  status: string;
  memo: string | null;
};

export type JournalEntryRow = TenantRow & {
  entry_number: string;
  entry_date: string;
  status: string;
  memo: string | null;
  source_type: string | null;
  source_id: string | null;
};

export type AccountRow = TenantRow & {
  category_id: string | null;
  parent_id: string | null;
  code: string;
  name: string;
  description: string | null;
  account_type: string;
  currency: string;
  is_active: boolean;
  is_system: boolean;
  balance: number;
};

export type BankAccountRow = TenantRow & {
  account_id: string | null;
  name: string;
  institution_name: string | null;
  account_number_last4: string | null;
  currency: string;
  current_balance: number;
  is_active: boolean;
};

export type ExpenseRow = TenantRow & {
  expense_date: string;
  vendor_id: string | null;
  account_id: string;
  project_id: string | null;
  amount: number;
  tax_amount: number;
  currency: string;
  receipt_url: string | null;
  is_billable: boolean;
  description: string;
  status: string;
};

export type ProjectRow = TenantRow & {
  name: string;
  customer_id: string | null;
  status: string;
  budget_amount: number;
  billing_method: string;
};

export type InventoryItemRow = TenantRow & {
  sku: string;
  name: string;
  unit: string;
  sales_price: number;
  purchase_price: number;
  quantity_on_hand: number;
  reorder_point: number;
  is_active: boolean;
};

export type FixedAssetRow = TenantRow & {
  asset_number: string;
  name: string;
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_months: number;
  depreciation_method: string;
  accumulated_depreciation: number;
  status: string;
};

export type BudgetRow = TenantRow & {
  name: string;
  fiscal_year: number;
  status: string;
  total_amount: number;
};

export type TaxRateRow = TenantRow & {
  name: string;
  rate: number;
  tax_type: string;
  is_compound: boolean;
  is_active: boolean;
};

export type CurrencyRow = {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
};

export type ProfileRow = {
  id: string;
  org_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  org_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Json;
  new_values: Json;
  created_at: string;
};

type InsertOf<T extends Record<string, unknown>> = Partial<T> & Record<string, unknown>;
type UpdateOf<T extends Record<string, unknown>> = Partial<T> & Record<string, unknown>;

export type Database = {
  public: {
    Tables: {
      organizations: TableShape<TenantRow & { name: string; base_currency: string }, InsertOf<TenantRow & { name: string; base_currency: string }>, UpdateOf<TenantRow & { name: string; base_currency: string }>>;
      profiles: TableShape<ProfileRow, InsertOf<ProfileRow>, UpdateOf<ProfileRow>>;
      contacts: TableShape<ContactRow, InsertOf<ContactRow>, UpdateOf<ContactRow>>;
      invoices: TableShape<InvoiceRow, InsertOf<InvoiceRow>, UpdateOf<InvoiceRow>>;
      bills: TableShape<BillRow, InsertOf<BillRow>, UpdateOf<BillRow>>;
      payments: TableShape<PaymentRow, InsertOf<PaymentRow>, UpdateOf<PaymentRow>>;
      expenses: TableShape<ExpenseRow, InsertOf<ExpenseRow>, UpdateOf<ExpenseRow>>;
      journal_entries: TableShape<JournalEntryRow, InsertOf<JournalEntryRow>, UpdateOf<JournalEntryRow>>;
      accounts: TableShape<AccountRow, InsertOf<AccountRow>, UpdateOf<AccountRow>>;
      bank_accounts: TableShape<BankAccountRow, InsertOf<BankAccountRow>, UpdateOf<BankAccountRow>>;
      budgets: TableShape<BudgetRow, InsertOf<BudgetRow>, UpdateOf<BudgetRow>>;
      fixed_assets: TableShape<FixedAssetRow, InsertOf<FixedAssetRow>, UpdateOf<FixedAssetRow>>;
      items: TableShape<InventoryItemRow, InsertOf<InventoryItemRow>, UpdateOf<InventoryItemRow>>;
      projects: TableShape<ProjectRow, InsertOf<ProjectRow>, UpdateOf<ProjectRow>>;
      tax_rates: TableShape<TaxRateRow, InsertOf<TaxRateRow>, UpdateOf<TaxRateRow>>;
      currencies: TableShape<CurrencyRow, InsertOf<CurrencyRow>, UpdateOf<CurrencyRow>>;
      exchange_rates: TableShape<TenantRow & { from_currency: string; to_currency: string; rate: number; effective_date: string }, InsertOf<TenantRow & { from_currency: string; to_currency: string; rate: number; effective_date: string }>, UpdateOf<TenantRow & { from_currency: string; to_currency: string; rate: number; effective_date: string }>>;
      audit_logs: TableShape<AuditLogRow, InsertOf<AuditLogRow>, UpdateOf<AuditLogRow>>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
