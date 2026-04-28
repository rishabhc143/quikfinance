CREATE TABLE IF NOT EXISTS public.bank_feeds (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  feed_name text NOT NULL,
  source_type text NOT NULL DEFAULT 'upload' CHECK (source_type IN ('upload','api','manual')),
  imported_on date NOT NULL,
  statement_date date NOT NULL,
  opening_balance numeric(20,2) NOT NULL DEFAULT 0,
  closing_balance numeric(20,2) NOT NULL DEFAULT 0,
  line_count integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','processing','reconciled','error')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.delivery_dispatches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  dispatch_number text NOT NULL,
  dispatch_date date NOT NULL,
  carrier_name text NOT NULL,
  tracking_number text,
  shipped_value numeric(20,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','packed','shipped','delivered','cancelled')),
  proof_status text NOT NULL DEFAULT 'pending' CHECK (proof_status IN ('pending','received','not_required')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, dispatch_number)
);

CREATE TABLE IF NOT EXISTS public.e_invoice_submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  submission_number text NOT NULL,
  submission_date date NOT NULL,
  taxable_value numeric(20,2) NOT NULL DEFAULT 0,
  total_tax numeric(20,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','submitted','generated','failed','cancelled')),
  irn text,
  ack_number text,
  ack_date date,
  error_message text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, submission_number)
);

CREATE TABLE IF NOT EXISTS public.tds_tcs_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  section_code text NOT NULL,
  tax_kind text NOT NULL DEFAULT 'tds' CHECK (tax_kind IN ('tds','tcs')),
  transaction_type text NOT NULL DEFAULT 'bill' CHECK (transaction_type IN ('bill','invoice','payment','journal')),
  transaction_id uuid,
  party_type text NOT NULL DEFAULT 'vendor' CHECK (party_type IN ('vendor','customer')),
  party_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  assessment_date date NOT NULL,
  base_amount numeric(20,2) NOT NULL DEFAULT 0,
  tax_rate numeric(10,4) NOT NULL DEFAULT 0,
  tax_amount numeric(20,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','posted','filed')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_feeds_org_status ON public.bank_feeds(org_id, status, imported_on DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_dispatches_org_status ON public.delivery_dispatches(org_id, status, dispatch_date DESC);
CREATE INDEX IF NOT EXISTS idx_e_invoice_submissions_org_status ON public.e_invoice_submissions(org_id, status, submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_tds_tcs_records_org_status ON public.tds_tcs_records(org_id, status, assessment_date DESC);

DROP TRIGGER IF EXISTS trg_bank_feeds_updated_at ON public.bank_feeds;
DROP TRIGGER IF EXISTS trg_delivery_dispatches_updated_at ON public.delivery_dispatches;
DROP TRIGGER IF EXISTS trg_e_invoice_submissions_updated_at ON public.e_invoice_submissions;
DROP TRIGGER IF EXISTS trg_tds_tcs_records_updated_at ON public.tds_tcs_records;

CREATE TRIGGER trg_bank_feeds_updated_at BEFORE UPDATE ON public.bank_feeds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_delivery_dispatches_updated_at BEFORE UPDATE ON public.delivery_dispatches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_e_invoice_submissions_updated_at BEFORE UPDATE ON public.e_invoice_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tds_tcs_records_updated_at BEFORE UPDATE ON public.tds_tcs_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bank_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_invoice_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tds_tcs_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_feeds_tenant_isolation ON public.bank_feeds;
DROP POLICY IF EXISTS delivery_dispatches_tenant_isolation ON public.delivery_dispatches;
DROP POLICY IF EXISTS e_invoice_submissions_tenant_isolation ON public.e_invoice_submissions;
DROP POLICY IF EXISTS tds_tcs_records_tenant_isolation ON public.tds_tcs_records;

CREATE POLICY bank_feeds_tenant_isolation
  ON public.bank_feeds
  FOR ALL
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY delivery_dispatches_tenant_isolation
  ON public.delivery_dispatches
  FOR ALL
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY e_invoice_submissions_tenant_isolation
  ON public.e_invoice_submissions
  FOR ALL
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY tds_tcs_records_tenant_isolation
  ON public.tds_tcs_records
  FOR ALL
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
