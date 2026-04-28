ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS discount_total numeric(20,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS place_of_supply text,
  ADD COLUMN IF NOT EXISTS template_type text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS terms text;

CREATE TABLE IF NOT EXISTS public.quotation_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_quotation_lines_org_quote ON public.quotation_lines(org_id, quotation_id, display_order);

ALTER TABLE public.quotation_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quotation_lines_tenant_isolation ON public.quotation_lines;
CREATE POLICY quotation_lines_tenant_isolation
  ON public.quotation_lines
  FOR ALL
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
