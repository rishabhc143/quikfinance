ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS pan text,
  ADD COLUMN IF NOT EXISTS state_code text,
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS default_upi_id text;

ALTER TABLE public.organizations
  ALTER COLUMN base_currency SET DEFAULT 'INR',
  ALTER COLUMN fiscal_year_start SET DEFAULT 4,
  ALTER COLUMN timezone SET DEFAULT 'Asia/Kolkata';

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS pan text,
  ADD COLUMN IF NOT EXISTS gst_treatment text NOT NULL DEFAULT 'registered',
  ADD COLUMN IF NOT EXISTS state_code text,
  ADD COLUMN IF NOT EXISTS opening_balance numeric(20,2) NOT NULL DEFAULT 0;

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS hsn_sac_code text,
  ADD COLUMN IF NOT EXISTS gst_rate numeric(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category_name text,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT false;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS place_of_supply text,
  ADD COLUMN IF NOT EXISTS round_off numeric(20,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terms text,
  ADD COLUMN IF NOT EXISTS template_type text NOT NULL DEFAULT 'classic';

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS place_of_supply text,
  ADD COLUMN IF NOT EXISTS tds_amount numeric(20,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  quotation_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL,
  due_date date NOT NULL,
  currency char(3) NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code),
  subtotal numeric(20,2) NOT NULL DEFAULT 0,
  tax_total numeric(20,2) NOT NULL DEFAULT 0,
  total numeric(20,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, quotation_number)
);

CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  sales_order_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL,
  due_date date NOT NULL,
  currency char(3) NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code),
  subtotal numeric(20,2) NOT NULL DEFAULT 0,
  tax_total numeric(20,2) NOT NULL DEFAULT 0,
  total numeric(20,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, sales_order_number)
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  purchase_order_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL,
  due_date date NOT NULL,
  currency char(3) NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code),
  subtotal numeric(20,2) NOT NULL DEFAULT 0,
  tax_total numeric(20,2) NOT NULL DEFAULT 0,
  total numeric(20,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, purchase_order_number)
);

CREATE TABLE IF NOT EXISTS public.credit_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  credit_note_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL,
  due_date date NOT NULL,
  currency char(3) NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code),
  subtotal numeric(20,2) NOT NULL DEFAULT 0,
  tax_total numeric(20,2) NOT NULL DEFAULT 0,
  total numeric(20,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, credit_note_number)
);

CREATE TABLE IF NOT EXISTS public.vendor_credits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  bill_id uuid REFERENCES public.bills(id) ON DELETE SET NULL,
  vendor_credit_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL,
  due_date date NOT NULL,
  currency char(3) NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code),
  subtotal numeric(20,2) NOT NULL DEFAULT 0,
  tax_total numeric(20,2) NOT NULL DEFAULT 0,
  total numeric(20,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, vendor_credit_number)
);

CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  work_date date NOT NULL,
  hours numeric(8,2) NOT NULL DEFAULT 0 CHECK (hours >= 0),
  rate numeric(20,2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  description text NOT NULL,
  is_billable boolean NOT NULL DEFAULT true,
  is_billed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotations_org_issue_date ON public.quotations(org_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_orders_org_issue_date ON public.sales_orders(org_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_issue_date ON public.purchase_orders(org_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_credit_notes_org_issue_date ON public.credit_notes(org_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_credits_org_issue_date ON public.vendor_credits(org_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_work_date ON public.time_entries(org_id, work_date DESC);

DROP TRIGGER IF EXISTS trg_quotations_updated_at ON public.quotations;
DROP TRIGGER IF EXISTS trg_sales_orders_updated_at ON public.sales_orders;
DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON public.purchase_orders;
DROP TRIGGER IF EXISTS trg_credit_notes_updated_at ON public.credit_notes;
DROP TRIGGER IF EXISTS trg_vendor_credits_updated_at ON public.vendor_credits;
DROP TRIGGER IF EXISTS trg_time_entries_updated_at ON public.time_entries;

CREATE TRIGGER trg_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_credit_notes_updated_at BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_vendor_credits_updated_at BEFORE UPDATE ON public.vendor_credits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_time_entries_updated_at BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'quotations',
    'sales_orders',
    'purchase_orders',
    'credit_notes',
    'vendor_credits',
    'time_entries'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_tenant_isolation', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id())',
      table_name || '_tenant_isolation',
      table_name
    );
  END LOOP;
END $$;
