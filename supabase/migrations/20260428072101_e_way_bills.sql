CREATE TABLE IF NOT EXISTS public.e_way_bills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dispatch_id uuid REFERENCES public.delivery_dispatches(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  dispatch_number text,
  invoice_number text,
  document_number text NOT NULL,
  generated_on date NOT NULL,
  transport_mode text NOT NULL DEFAULT 'road' CHECK (transport_mode IN ('road','rail','air','ship')),
  transporter_name text,
  vehicle_number text,
  tracking_number text,
  distance_km numeric(12,2) NOT NULL DEFAULT 0,
  taxable_value numeric(20,2) NOT NULL DEFAULT 0,
  total_tax numeric(20,2) NOT NULL DEFAULT 0,
  valid_until date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','generated','expired','cancelled')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, document_number)
);

CREATE INDEX IF NOT EXISTS idx_e_way_bills_org_status
  ON public.e_way_bills(org_id, status, generated_on DESC);

DROP TRIGGER IF EXISTS trg_e_way_bills_updated_at ON public.e_way_bills;
CREATE TRIGGER trg_e_way_bills_updated_at
  BEFORE UPDATE ON public.e_way_bills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.e_way_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS e_way_bills_tenant_isolation ON public.e_way_bills;
CREATE POLICY e_way_bills_tenant_isolation
  ON public.e_way_bills
  FOR ALL
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
