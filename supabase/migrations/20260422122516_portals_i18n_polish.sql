CREATE TABLE IF NOT EXISTS public.portal_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  portal_type text NOT NULL CHECK (portal_type IN ('customer', 'ca')),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  display_name text,
  email text,
  access_token text NOT NULL UNIQUE,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz,
  last_accessed_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portal_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  portal_link_id uuid NOT NULL REFERENCES public.portal_links(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_email text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_links_org_type ON public.portal_links(org_id, portal_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_links_token ON public.portal_links(access_token);
CREATE INDEX IF NOT EXISTS idx_portal_comments_portal ON public.portal_comments(portal_link_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_portal_links_updated_at ON public.portal_links;
CREATE TRIGGER trg_portal_links_updated_at BEFORE UPDATE ON public.portal_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.portal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portal_links_tenant_isolation ON public.portal_links;
CREATE POLICY portal_links_tenant_isolation
  ON public.portal_links
  FOR ALL
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS portal_comments_tenant_isolation ON public.portal_comments;
CREATE POLICY portal_comments_tenant_isolation
  ON public.portal_comments
  FOR ALL
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
