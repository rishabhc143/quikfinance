ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS pin_code text,
  ADD COLUMN IF NOT EXISTS gst_registered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gst_filing_frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS place_of_supply text,
  ADD COLUMN IF NOT EXISTS accounting_method text NOT NULL DEFAULT 'accrual',
  ADD COLUMN IF NOT EXISTS fiscal_year_start_date date,
  ADD COLUMN IF NOT EXISTS fiscal_year_end_date date,
  ADD COLUMN IF NOT EXISTS fiscal_year_start_month int NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS invoice_next_number int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_terms text NOT NULL DEFAULT 'Net 30',
  ADD COLUMN IF NOT EXISTS setup_completed boolean NOT NULL DEFAULT false;

UPDATE public.organizations
SET
  fiscal_year_start_month = COALESCE(fiscal_year_start_month, fiscal_year_start, 4),
  fiscal_year_start_date = COALESCE(fiscal_year_start_date, make_date(EXTRACT(YEAR FROM now())::int, COALESCE(fiscal_year_start, 4), 1)),
  fiscal_year_end_date = COALESCE(fiscal_year_end_date, (make_date(EXTRACT(YEAR FROM now())::int, COALESCE(fiscal_year_start, 4), 1) + interval '1 year - 1 day')::date),
  gst_registered = COALESCE(gst_registered, gstin IS NOT NULL AND length(trim(gstin)) > 0),
  place_of_supply = COALESCE(place_of_supply, state_code),
  invoice_next_number = COALESCE(invoice_next_number, 1),
  setup_completed = COALESCE(setup_completed, false);
