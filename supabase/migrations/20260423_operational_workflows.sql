CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'transaction_approval',
  entity_type text,
  entity_id uuid,
  title text NOT NULL,
  description text,
  amount numeric(20,2) NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  requested_by uuid REFERENCES auth.users(id),
  assigned_role text NOT NULL DEFAULT 'owner',
  approved_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_exceptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  title text NOT NULL,
  description text,
  entity_type text,
  entity_id uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','ignored')),
  assigned_to uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.gst_itc_reconciliations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_name text NOT NULL,
  vendor_gstin text,
  bill_number text NOT NULL,
  bill_date date,
  taxable_value numeric(20,2) NOT NULL DEFAULT 0,
  tax_amount numeric(20,2) NOT NULL DEFAULT 0,
  gstr2b_tax_amount numeric(20,2) NOT NULL DEFAULT 0,
  match_status text NOT NULL DEFAULT 'unmatched' CHECK (match_status IN ('matched','partial','unmatched','blocked')),
  action_status text NOT NULL DEFAULT 'review' CHECK (action_status IN ('review','claim','hold','rejected')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.razorpay_settlements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  settlement_id text NOT NULL,
  settlement_date date NOT NULL,
  gross_amount numeric(20,2) NOT NULL DEFAULT 0,
  fee_amount numeric(20,2) NOT NULL DEFAULT 0,
  tax_amount numeric(20,2) NOT NULL DEFAULT 0,
  net_amount numeric(20,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','matched','posted','exception')),
  matched_bank_transaction_id uuid REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, settlement_id)
);

CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('receipt','issue','transfer','adjustment','dispatch')),
  quantity numeric(20,4) NOT NULL DEFAULT 0,
  unit_cost numeric(20,2) NOT NULL DEFAULT 0,
  total_value numeric(20,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  source_type text,
  source_id uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','cancelled')),
  reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_batches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('tally','zoho_books','csv','bank_statement','marketplace')),
  entity_type text NOT NULL,
  file_name text,
  status text NOT NULL DEFAULT 'mapping' CHECK (status IN ('mapping','validating','ready','imported','failed')),
  total_rows int NOT NULL DEFAULT 0,
  imported_rows int NOT NULL DEFAULT 0,
  failed_rows int NOT NULL DEFAULT 0,
  validation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_index (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text,
  entity_id uuid,
  document_type text NOT NULL DEFAULT 'attachment',
  file_name text NOT NULL,
  file_path text,
  status text NOT NULL DEFAULT 'indexed' CHECK (status IN ('indexed','ocr_review','duplicate','archived')),
  confidence_score numeric(5,2),
  duplicate_of uuid REFERENCES public.document_index(id) ON DELETE SET NULL,
  extracted_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.close_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  title text NOT NULL,
  owner_role text NOT NULL DEFAULT 'accountant',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','blocked')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS public.finance_insights (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','dismissed','resolved')),
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_org_status ON public.approval_requests(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_exceptions_org_status ON public.workflow_exceptions(org_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_automation_rules_org_active ON public.automation_rules(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_gst_itc_reconciliations_org_match ON public.gst_itc_reconciliations(org_id, match_status);
CREATE INDEX IF NOT EXISTS idx_razorpay_settlements_org_status ON public.razorpay_settlements(org_id, status, settlement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_type ON public.stock_movements(org_id, movement_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_migration_batches_org_status ON public.migration_batches(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_index_org_status ON public.document_index(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_close_tasks_org_period ON public.close_tasks(org_id, period_start, status);
CREATE INDEX IF NOT EXISTS idx_finance_insights_org_status ON public.finance_insights(org_id, status, severity);

DROP TRIGGER IF EXISTS trg_approval_requests_updated_at ON public.approval_requests;
DROP TRIGGER IF EXISTS trg_workflow_exceptions_updated_at ON public.workflow_exceptions;
DROP TRIGGER IF EXISTS trg_automation_rules_updated_at ON public.automation_rules;
DROP TRIGGER IF EXISTS trg_gst_itc_reconciliations_updated_at ON public.gst_itc_reconciliations;
DROP TRIGGER IF EXISTS trg_razorpay_settlements_updated_at ON public.razorpay_settlements;
DROP TRIGGER IF EXISTS trg_warehouses_updated_at ON public.warehouses;
DROP TRIGGER IF EXISTS trg_stock_movements_updated_at ON public.stock_movements;
DROP TRIGGER IF EXISTS trg_migration_batches_updated_at ON public.migration_batches;
DROP TRIGGER IF EXISTS trg_document_index_updated_at ON public.document_index;
DROP TRIGGER IF EXISTS trg_close_tasks_updated_at ON public.close_tasks;
DROP TRIGGER IF EXISTS trg_finance_insights_updated_at ON public.finance_insights;

CREATE TRIGGER trg_approval_requests_updated_at BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_workflow_exceptions_updated_at BEFORE UPDATE ON public.workflow_exceptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_automation_rules_updated_at BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_gst_itc_reconciliations_updated_at BEFORE UPDATE ON public.gst_itc_reconciliations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_razorpay_settlements_updated_at BEFORE UPDATE ON public.razorpay_settlements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_stock_movements_updated_at BEFORE UPDATE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_migration_batches_updated_at BEFORE UPDATE ON public.migration_batches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_document_index_updated_at BEFORE UPDATE ON public.document_index FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_close_tasks_updated_at BEFORE UPDATE ON public.close_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_finance_insights_updated_at BEFORE UPDATE ON public.finance_insights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'approval_requests',
    'workflow_exceptions',
    'automation_rules',
    'gst_itc_reconciliations',
    'razorpay_settlements',
    'warehouses',
    'stock_movements',
    'migration_batches',
    'document_index',
    'close_tasks',
    'finance_insights'
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
