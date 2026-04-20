CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  legal_name text,
  tax_id text,
  address jsonb DEFAULT '{}'::jsonb,
  phone text,
  email text,
  logo_url text,
  base_currency char(3) NOT NULL DEFAULT 'USD',
  fiscal_year_start int NOT NULL DEFAULT 1 CHECK (fiscal_year_start BETWEEN 1 AND 12),
  date_format text NOT NULL DEFAULT 'MM/DD/YYYY',
  timezone text NOT NULL DEFAULT 'UTC',
  invoice_prefix text NOT NULL DEFAULT 'INV',
  bill_prefix text NOT NULL DEFAULT 'BILL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','accountant','member','viewer')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.currencies (
  code char(3) PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  decimal_places int NOT NULL DEFAULT 2 CHECK (decimal_places BETWEEN 0 AND 4)
);

CREATE TABLE public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_currency char(3) NOT NULL REFERENCES public.currencies(code),
  to_currency char(3) NOT NULL REFERENCES public.currencies(code),
  rate numeric(20,8) NOT NULL CHECK (rate > 0),
  effective_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, from_currency, to_currency, effective_date)
);

CREATE TABLE public.account_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense')),
  normal_balance text NOT NULL CHECK (normal_balance IN ('debit','credit')),
  display_order int NOT NULL DEFAULT 0,
  UNIQUE (org_id, name)
);

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.account_categories(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  account_type text NOT NULL CHECK (account_type IN (
    'cash','bank','accounts_receivable','other_current_asset','fixed_asset','other_asset',
    'accounts_payable','other_current_liability','long_term_liability','equity',
    'retained_earnings','revenue','cost_of_goods_sold','expense','other_income','other_expense'
  )),
  currency char(3) NOT NULL DEFAULT 'USD' REFERENCES public.currencies(code),
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  balance numeric(20,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('customer','vendor','both')),
  display_name text NOT NULL,
  company_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  website text,
  tax_id text,
  currency char(3) NOT NULL DEFAULT 'USD' REFERENCES public.currencies(code),
  payment_terms int NOT NULL DEFAULT 30 CHECK (payment_terms BETWEEN 0 AND 365),
  credit_limit numeric(20,2),
  billing_address jsonb DEFAULT '{}'::jsonb,
  shipping_address jsonb DEFAULT '{}'::jsonb,
  notes text,
  ar_account_id uuid REFERENCES public.accounts(id),
  ap_account_id uuid REFERENCES public.accounts(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tax_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate numeric(8,4) NOT NULL CHECK (rate >= 0),
  tax_type text NOT NULL,
  payable_account_id uuid REFERENCES public.accounts(id),
  recoverable_account_id uuid REFERENCES public.accounts(id),
  is_compound boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  item_type text NOT NULL DEFAULT 'product' CHECK (item_type IN ('product','service')),
  unit text NOT NULL DEFAULT 'each',
  sales_price numeric(20,2) NOT NULL DEFAULT 0,
  purchase_price numeric(20,2) NOT NULL DEFAULT 0,
  income_account_id uuid REFERENCES public.accounts(id),
  expense_account_id uuid REFERENCES public.accounts(id),
  asset_account_id uuid REFERENCES public.accounts(id),
  quantity_on_hand numeric(20,4) NOT NULL DEFAULT 0,
  reorder_point numeric(20,4) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, sku)
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id),
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','partial','paid','overdue','void')),
  issue_date date NOT NULL,
  due_date date NOT NULL,
  currency char(3) NOT NULL DEFAULT 'USD' REFERENCES public.currencies(code),
  exchange_rate numeric(20,8) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  subtotal numeric(20,2) NOT NULL DEFAULT 0,
  discount_total numeric(20,2) NOT NULL DEFAULT 0,
  tax_total numeric(20,2) NOT NULL DEFAULT 0,
  total numeric(20,2) NOT NULL DEFAULT 0,
  balance_due numeric(20,2) NOT NULL DEFAULT 0,
  notes text,
  pdf_url text,
  sent_at timestamptz,
  viewed_at timestamptz,
  journal_entry_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, invoice_number),
  CHECK (due_date >= issue_date)
);

CREATE TABLE public.invoice_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items(id),
  account_id uuid REFERENCES public.accounts(id),
  description text NOT NULL,
  quantity numeric(20,4) NOT NULL CHECK (quantity > 0),
  rate numeric(20,2) NOT NULL DEFAULT 0,
  discount numeric(20,2) NOT NULL DEFAULT 0,
  tax_rate_id uuid REFERENCES public.tax_rates(id),
  tax_amount numeric(20,2) NOT NULL DEFAULT 0,
  line_total numeric(20,2) NOT NULL DEFAULT 0,
  display_order int NOT NULL DEFAULT 0
);

CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id),
  bill_number text NOT NULL,
  vendor_reference text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','partial','paid','void')),
  issue_date date NOT NULL,
  due_date date NOT NULL,
  currency char(3) NOT NULL DEFAULT 'USD' REFERENCES public.currencies(code),
  exchange_rate numeric(20,8) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  subtotal numeric(20,2) NOT NULL DEFAULT 0,
  discount_total numeric(20,2) NOT NULL DEFAULT 0,
  tax_total numeric(20,2) NOT NULL DEFAULT 0,
  total numeric(20,2) NOT NULL DEFAULT 0,
  balance_due numeric(20,2) NOT NULL DEFAULT 0,
  notes text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  journal_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, bill_number),
  CHECK (due_date >= issue_date)
);

CREATE TABLE public.bill_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items(id),
  account_id uuid REFERENCES public.accounts(id),
  description text NOT NULL,
  quantity numeric(20,4) NOT NULL CHECK (quantity > 0),
  rate numeric(20,2) NOT NULL DEFAULT 0,
  discount numeric(20,2) NOT NULL DEFAULT 0,
  tax_rate_id uuid REFERENCES public.tax_rates(id),
  tax_amount numeric(20,2) NOT NULL DEFAULT 0,
  line_total numeric(20,2) NOT NULL DEFAULT 0,
  display_order int NOT NULL DEFAULT 0
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id),
  payment_type text NOT NULL CHECK (payment_type IN ('received','made')),
  payment_date date NOT NULL,
  amount numeric(20,2) NOT NULL CHECK (amount >= 0),
  unapplied_amount numeric(20,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'USD' REFERENCES public.currencies(code),
  exchange_rate numeric(20,8) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  method text NOT NULL,
  reference text,
  deposit_account_id uuid REFERENCES public.accounts(id),
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('draft','posted','void')),
  memo text,
  journal_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_allocations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE,
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((invoice_id IS NOT NULL)::int + (bill_id IS NOT NULL)::int = 1)
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  expense_date date NOT NULL,
  vendor_id uuid REFERENCES public.contacts(id),
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  project_id uuid,
  amount numeric(20,2) NOT NULL CHECK (amount >= 0),
  tax_amount numeric(20,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'USD' REFERENCES public.currencies(code),
  payment_account_id uuid REFERENCES public.accounts(id),
  receipt_url text,
  is_billable boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('draft','posted','void')),
  journal_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_number text NOT NULL,
  entry_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','posted','void')),
  memo text,
  source_type text,
  source_id uuid,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  posted_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, entry_number)
);

CREATE TABLE public.journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  description text,
  debit numeric(20,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric(20,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  display_order int NOT NULL DEFAULT 0,
  CHECK (debit > 0 OR credit > 0),
  CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id),
  name text NOT NULL,
  institution_name text,
  account_number_last4 text,
  currency char(3) NOT NULL DEFAULT 'USD' REFERENCES public.currencies(code),
  current_balance numeric(20,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  description text NOT NULL,
  amount numeric(20,2) NOT NULL,
  reference text,
  matched_journal_entry_id uuid REFERENCES public.journal_entries(id),
  reconciliation_id uuid,
  status text NOT NULL DEFAULT 'imported' CHECK (status IN ('imported','matched','reconciled','ignored')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reconciliations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  statement_start date NOT NULL,
  statement_end date NOT NULL,
  statement_balance numeric(20,2) NOT NULL,
  book_balance numeric(20,2) NOT NULL,
  difference numeric(20,2) NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','void')),
  completed_by uuid REFERENCES auth.users(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (statement_end >= statement_start)
);

ALTER TABLE public.bank_transactions
  ADD CONSTRAINT bank_transactions_reconciliation_id_fkey
  FOREIGN KEY (reconciliation_id) REFERENCES public.reconciliations(id) ON DELETE SET NULL;

CREATE TABLE public.fixed_assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_number text NOT NULL,
  name text NOT NULL,
  purchase_date date NOT NULL,
  purchase_cost numeric(20,2) NOT NULL CHECK (purchase_cost >= 0),
  salvage_value numeric(20,2) NOT NULL DEFAULT 0,
  useful_life_months int NOT NULL CHECK (useful_life_months > 0),
  depreciation_method text NOT NULL DEFAULT 'straight_line' CHECK (depreciation_method IN ('straight_line','declining_balance')),
  accumulated_depreciation numeric(20,2) NOT NULL DEFAULT 0,
  asset_account_id uuid REFERENCES public.accounts(id),
  depreciation_expense_account_id uuid REFERENCES public.accounts(id),
  accumulated_depreciation_account_id uuid REFERENCES public.accounts(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disposed','retired')),
  disposal_date date,
  disposal_amount numeric(20,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, asset_number)
);

CREATE TABLE public.depreciation_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fixed_asset_id uuid NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount numeric(20,2) NOT NULL CHECK (amount >= 0),
  journal_entry_id uuid REFERENCES public.journal_entries(id),
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  fiscal_year int NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  total_amount numeric(20,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name, fiscal_year)
);

CREATE TABLE public.budget_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount numeric(20,2) NOT NULL DEFAULT 0,
  UNIQUE (budget_id, account_id, month)
);

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  movement_date date NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('purchase','sale','adjustment','return')),
  quantity numeric(20,4) NOT NULL,
  unit_cost numeric(20,2) NOT NULL DEFAULT 0,
  source_type text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.contacts(id),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('planned','active','on_hold','complete')),
  budget_amount numeric(20,2) NOT NULL DEFAULT 0,
  billing_method text NOT NULL DEFAULT 'time_and_materials' CHECK (billing_method IN ('fixed_fee','time_and_materials','non_billable')),
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE TABLE public.project_time_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  entry_date date NOT NULL,
  hours numeric(10,2) NOT NULL CHECK (hours > 0),
  billable_rate numeric(20,2) NOT NULL DEFAULT 0,
  description text NOT NULL,
  is_billed boolean NOT NULL DEFAULT false,
  invoice_id uuid REFERENCES public.invoices(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recurring_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('invoice','bill','expense','journal_entry')),
  source_id uuid NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily','weekly','monthly','quarterly','annually')),
  start_date date NOT NULL,
  end_date date,
  occurrence_count int,
  next_run_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_type text NOT NULL CHECK (template_type IN ('invoice','reminder','statement','invite')),
  subject text NOT NULL,
  body text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.document_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  body text NOT NULL,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_org ON public.profiles(org_id);
CREATE INDEX idx_contacts_org_type ON public.contacts(org_id, type);
CREATE INDEX idx_contacts_search ON public.contacts USING gin (display_name gin_trgm_ops);
CREATE INDEX idx_accounts_org_type ON public.accounts(org_id, account_type);
CREATE INDEX idx_invoices_org_status ON public.invoices(org_id, status);
CREATE INDEX idx_invoices_contact ON public.invoices(contact_id);
CREATE INDEX idx_bills_org_status ON public.bills(org_id, status);
CREATE INDEX idx_payments_org_date ON public.payments(org_id, payment_date);
CREATE INDEX idx_expenses_org_date ON public.expenses(org_id, expense_date);
CREATE INDEX idx_journal_entries_org_date ON public.journal_entries(org_id, entry_date);
CREATE INDEX idx_bank_transactions_org_account ON public.bank_transactions(org_id, bank_account_id);
CREATE INDEX idx_audit_logs_org_entity ON public.audit_logs(org_id, entity_type, entity_id);

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tax_rates_updated_at BEFORE UPDATE ON public.tax_rates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bills_updated_at BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_fixed_assets_updated_at BEFORE UPDATE ON public.fixed_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_recurring_transactions_updated_at BEFORE UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_journal_balanced(p_journal_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  debit_total numeric(20,2);
  credit_total numeric(20,2);
BEGIN
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO debit_total, credit_total
  FROM public.journal_entry_lines
  WHERE journal_entry_id = p_journal_entry_id;

  IF debit_total <> credit_total THEN
    RAISE EXCEPTION 'Journal entry % is not balanced. Debits %, credits %', p_journal_entry_id, debit_total, credit_total;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_posted_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'posted' THEN
    PERFORM public.ensure_journal_balanced(NEW.id);
    NEW.posted_at = COALESCE(NEW.posted_at, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_posted_journal_entry
BEFORE INSERT OR UPDATE OF status ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.validate_posted_journal_entry();

CREATE OR REPLACE FUNCTION public.seed_default_accounts(p_org_id uuid, p_currency char(3) DEFAULT 'USD')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  asset_id uuid;
  liability_id uuid;
  equity_id uuid;
  revenue_id uuid;
  expense_id uuid;
BEGIN
  INSERT INTO account_categories (org_id, name, type, normal_balance, display_order)
  VALUES
    (p_org_id, 'Assets', 'asset', 'debit', 1),
    (p_org_id, 'Liabilities', 'liability', 'credit', 2),
    (p_org_id, 'Equity', 'equity', 'credit', 3),
    (p_org_id, 'Revenue', 'revenue', 'credit', 4),
    (p_org_id, 'Expenses', 'expense', 'debit', 5)
  ON CONFLICT (org_id, name) DO NOTHING;

  SELECT id INTO asset_id FROM account_categories WHERE org_id = p_org_id AND name = 'Assets';
  SELECT id INTO liability_id FROM account_categories WHERE org_id = p_org_id AND name = 'Liabilities';
  SELECT id INTO equity_id FROM account_categories WHERE org_id = p_org_id AND name = 'Equity';
  SELECT id INTO revenue_id FROM account_categories WHERE org_id = p_org_id AND name = 'Revenue';
  SELECT id INTO expense_id FROM account_categories WHERE org_id = p_org_id AND name = 'Expenses';

  INSERT INTO accounts (org_id, category_id, code, name, account_type, currency, is_system)
  VALUES
    (p_org_id, asset_id, '1000', 'Operating Bank', 'bank', p_currency, true),
    (p_org_id, asset_id, '1010', 'Cash on Hand', 'cash', p_currency, true),
    (p_org_id, asset_id, '1200', 'Accounts Receivable', 'accounts_receivable', p_currency, true),
    (p_org_id, asset_id, '1400', 'Inventory Asset', 'other_current_asset', p_currency, true),
    (p_org_id, asset_id, '1500', 'Fixed Assets', 'fixed_asset', p_currency, true),
    (p_org_id, liability_id, '2000', 'Accounts Payable', 'accounts_payable', p_currency, true),
    (p_org_id, liability_id, '2200', 'Tax Payable', 'other_current_liability', p_currency, true),
    (p_org_id, liability_id, '2210', 'Tax Recoverable', 'other_current_asset', p_currency, true),
    (p_org_id, equity_id, '3000', 'Owner Equity', 'equity', p_currency, true),
    (p_org_id, equity_id, '3100', 'Retained Earnings', 'retained_earnings', p_currency, true),
    (p_org_id, revenue_id, '4000', 'Sales Revenue', 'revenue', p_currency, true),
    (p_org_id, revenue_id, '4100', 'Service Revenue', 'revenue', p_currency, true),
    (p_org_id, expense_id, '5000', 'Cost of Goods Sold', 'cost_of_goods_sold', p_currency, true),
    (p_org_id, expense_id, '6000', 'Office Expenses', 'expense', p_currency, true),
    (p_org_id, expense_id, '6100', 'Travel Expenses', 'expense', p_currency, true),
    (p_org_id, expense_id, '6200', 'Software Subscriptions', 'expense', p_currency, true),
    (p_org_id, expense_id, '6900', 'FX Gain or Loss', 'other_expense', p_currency, true)
  ON CONFLICT (org_id, code) DO NOTHING;

  INSERT INTO tax_rates (org_id, name, rate, tax_type, is_compound)
  VALUES
    (p_org_id, 'GST 5%', 5, 'GST', false),
    (p_org_id, 'VAT 20%', 20, 'VAT', false),
    (p_org_id, 'Sales Tax 8.25%', 8.25, 'Sales Tax', false)
  ON CONFLICT (org_id, name) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  company_name text;
  base_currency char(3);
BEGIN
  company_name := COALESCE(NEW.raw_user_meta_data ->> 'company', split_part(NEW.email, '@', 1), 'New organization');
  base_currency := COALESCE(NEW.raw_user_meta_data ->> 'base_currency', 'USD')::char(3);

  INSERT INTO organizations (name, base_currency)
  VALUES (company_name, base_currency)
  RETURNING id INTO new_org_id;

  INSERT INTO profiles (id, org_id, full_name, avatar_url, role)
  VALUES (NEW.id, new_org_id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'avatar_url', 'owner');

  PERFORM public.seed_default_accounts(new_org_id, base_currency);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid() AND is_active = true
$$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_member_access ON public.organizations
  FOR ALL USING (id = public.current_org_id())
  WITH CHECK (id = public.current_org_id());

CREATE POLICY profiles_org_access ON public.profiles
  FOR SELECT USING (id = auth.uid() OR org_id = public.current_org_id());

CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY currencies_public_read ON public.currencies
  FOR SELECT USING (true);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'exchange_rates','account_categories','accounts','contacts','tax_rates','items',
    'invoices','invoice_lines','bills','bill_lines','payments','payment_allocations',
    'expenses','journal_entries','journal_entry_lines','bank_accounts','bank_transactions',
    'reconciliations','fixed_assets','depreciation_entries','budgets','budget_lines',
    'inventory_movements','projects','project_time_entries','recurring_transactions',
    'email_templates','document_attachments','notifications','audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id())',
      table_name || '_tenant_isolation',
      table_name
    );
  END LOOP;
END $$;

INSERT INTO public.currencies (code, name, symbol, decimal_places) VALUES
  ('USD','US Dollar','$',2), ('EUR','Euro','EUR',2), ('GBP','British Pound','GBP',2), ('INR','Indian Rupee','Rs',2),
  ('JPY','Japanese Yen','JPY',0), ('CAD','Canadian Dollar','CAD',2), ('AUD','Australian Dollar','AUD',2), ('CHF','Swiss Franc','CHF',2),
  ('CNY','Chinese Yuan','CNY',2), ('SGD','Singapore Dollar','SGD',2), ('HKD','Hong Kong Dollar','HKD',2), ('NZD','New Zealand Dollar','NZD',2),
  ('SEK','Swedish Krona','SEK',2), ('NOK','Norwegian Krone','NOK',2), ('DKK','Danish Krone','DKK',2), ('ZAR','South African Rand','ZAR',2),
  ('BRL','Brazilian Real','BRL',2), ('MXN','Mexican Peso','MXN',2), ('AED','UAE Dirham','AED',2), ('SAR','Saudi Riyal','SAR',2),
  ('THB','Thai Baht','THB',2), ('MYR','Malaysian Ringgit','MYR',2), ('IDR','Indonesian Rupiah','IDR',2), ('PHP','Philippine Peso','PHP',2),
  ('KRW','South Korean Won','KRW',0), ('TRY','Turkish Lira','TRY',2), ('PLN','Polish Zloty','PLN',2), ('CZK','Czech Koruna','CZK',2),
  ('HUF','Hungarian Forint','HUF',2), ('ILS','Israeli Shekel','ILS',2), ('QAR','Qatari Riyal','QAR',2), ('KWD','Kuwaiti Dinar','KWD',3),
  ('BHD','Bahraini Dinar','BHD',3), ('OMR','Omani Rial','OMR',3), ('EGP','Egyptian Pound','EGP',2), ('NGN','Nigerian Naira','NGN',2),
  ('KES','Kenyan Shilling','KES',2), ('GHS','Ghanaian Cedi','GHS',2), ('MAD','Moroccan Dirham','MAD',2), ('ARS','Argentine Peso','ARS',2),
  ('CLP','Chilean Peso','CLP',0), ('COP','Colombian Peso','COP',2), ('PEN','Peruvian Sol','PEN',2), ('RON','Romanian Leu','RON',2),
  ('BGN','Bulgarian Lev','BGN',2), ('HRK','Croatian Kuna','HRK',2), ('VND','Vietnamese Dong','VND',0), ('TWD','New Taiwan Dollar','TWD',2),
  ('PKR','Pakistani Rupee','PKR',2), ('BDT','Bangladeshi Taka','BDT',2)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    decimal_places = EXCLUDED.decimal_places;

CREATE VIEW public.v_invoice_aging
WITH (security_invoker = true) AS
SELECT
  i.org_id,
  i.id AS invoice_id,
  i.invoice_number,
  c.display_name AS customer_name,
  i.due_date,
  i.balance_due,
  CASE
    WHEN i.status = 'paid' THEN 'paid'
    WHEN i.due_date >= CURRENT_DATE THEN 'current'
    WHEN CURRENT_DATE - i.due_date BETWEEN 1 AND 30 THEN '1-30'
    WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN '31-60'
    WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN '61-90'
    ELSE '90+'
  END AS aging_bucket
FROM public.invoices i
JOIN public.contacts c ON c.id = i.contact_id
WHERE i.status <> 'void';

CREATE VIEW public.v_account_balances
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.org_id,
  a.code,
  a.name,
  a.account_type,
  COALESCE(SUM(jl.debit), 0) AS total_debits,
  COALESCE(SUM(jl.credit), 0) AS total_credits,
  CASE
    WHEN a.account_type IN ('cash','bank','accounts_receivable','other_current_asset','fixed_asset','other_asset','expense','cost_of_goods_sold')
      THEN COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0)
    ELSE COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0)
  END AS balance
FROM public.accounts a
LEFT JOIN public.journal_entry_lines jl ON jl.account_id = a.id
LEFT JOIN public.journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'
GROUP BY a.id;

CREATE VIEW public.v_trial_balance
WITH (security_invoker = true) AS
SELECT org_id, code, name, total_debits AS debit, total_credits AS credit
FROM public.v_account_balances;

CREATE VIEW public.v_profit_loss
WITH (security_invoker = true) AS
SELECT
  a.org_id,
  a.code,
  a.name,
  a.account_type,
  COALESCE(SUM(jl.credit - jl.debit), 0) AS amount
FROM public.accounts a
JOIN public.journal_entry_lines jl ON jl.account_id = a.id
JOIN public.journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'
WHERE a.account_type IN ('revenue','cost_of_goods_sold','expense','other_income','other_expense')
GROUP BY a.org_id, a.code, a.name, a.account_type;

CREATE VIEW public.v_balance_sheet
WITH (security_invoker = true) AS
SELECT *
FROM public.v_account_balances
WHERE account_type IN (
  'cash','bank','accounts_receivable','other_current_asset','fixed_asset','other_asset',
  'accounts_payable','other_current_liability','long_term_liability','equity','retained_earnings'
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-pdfs', 'invoice-pdfs', false), ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;
