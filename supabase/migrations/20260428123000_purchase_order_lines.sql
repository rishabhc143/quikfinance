ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS discount_total numeric(20,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_org_order ON public.purchase_order_lines(org_id, purchase_order_id, display_order);

ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_order_lines_tenant_isolation ON public.purchase_order_lines;
CREATE POLICY purchase_order_lines_tenant_isolation
  ON public.purchase_order_lines
  FOR ALL
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
