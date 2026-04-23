ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS follow_up jsonb NOT NULL DEFAULT '{}'::jsonb;
