CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('csv','tally','zoho_books','bank_statement')),
  entity_type text NOT NULL CHECK (entity_type IN ('customers','vendors','invoices','bills','payments','bank_transactions')),
  file_name text,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  raw_payload text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','completed_with_warnings','failed')),
  total_rows int NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  imported_rows int NOT NULL DEFAULT 0 CHECK (imported_rows >= 0),
  failed_rows int NOT NULL DEFAULT 0 CHECK (failed_rows >= 0),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.period_locks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  lock_scope text NOT NULL DEFAULT 'all' CHECK (lock_scope IN ('all','sales','purchases','banking','journals')),
  reason text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE public.ocr_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'bill' CHECK (document_type IN ('bill','invoice')),
  source_name text NOT NULL,
  source_text text NOT NULL,
  status text NOT NULL DEFAULT 'parsed' CHECK (status IN ('uploaded','parsed','draft_created','failed')),
  linked_entity_id uuid,
  extracted_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_payment_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'razorpay',
  provider_link_id text NOT NULL,
  reference_id text,
  short_url text,
  status text NOT NULL DEFAULT 'created',
  currency char(3) NOT NULL DEFAULT 'USD' REFERENCES public.currencies(code),
  amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  amount_paid numeric(20,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  amount_refunded numeric(20,2) NOT NULL DEFAULT 0 CHECK (amount_refunded >= 0),
  callback_url text,
  latest_payment_id text,
  raw_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_link_id)
);

CREATE TABLE public.gateway_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  provider_link_id text,
  provider_payment_id text,
  provider_refund_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE INDEX idx_import_jobs_org_created_at ON public.import_jobs(org_id, created_at DESC);
CREATE INDEX idx_period_locks_org_range ON public.period_locks(org_id, start_date, end_date);
CREATE INDEX idx_ocr_documents_org_created_at ON public.ocr_documents(org_id, created_at DESC);
CREATE INDEX idx_invoice_payment_links_invoice ON public.invoice_payment_links(org_id, invoice_id, created_at DESC);
CREATE INDEX idx_gateway_events_lookup ON public.gateway_events(provider, provider_payment_id, provider_link_id);

CREATE TRIGGER trg_import_jobs_updated_at BEFORE UPDATE ON public.import_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_period_locks_updated_at BEFORE UPDATE ON public.period_locks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ocr_documents_updated_at BEFORE UPDATE ON public.ocr_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoice_payment_links_updated_at BEFORE UPDATE ON public.invoice_payment_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'import_jobs',
    'period_locks',
    'ocr_documents',
    'invoice_payment_links',
    'gateway_events'
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
