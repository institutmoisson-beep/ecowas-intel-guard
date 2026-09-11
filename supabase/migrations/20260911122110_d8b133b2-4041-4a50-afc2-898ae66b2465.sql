ALTER TABLE public.publication_scans
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_kind text,
  ADD COLUMN IF NOT EXISTS transcript text,
  ADD COLUMN IF NOT EXISTS media_analysis text;

CREATE TABLE IF NOT EXISTS public.suspension_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES public.publication_scans(id) ON DELETE SET NULL,
  platform text NOT NULL,
  account_handle text,
  account_url text,
  post_url text NOT NULL,
  report_url text,
  reason text NOT NULL DEFAULT 'defamation',
  severity text NOT NULL DEFAULT 'HIGH',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_body text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suspension_requests TO authenticated;
GRANT ALL ON public.suspension_requests TO service_role;

ALTER TABLE public.suspension_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suspension_requests_staff" ON public.suspension_requests
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS suspension_requests_created_at_idx ON public.suspension_requests (created_at DESC);

CREATE TRIGGER update_suspension_requests_updated_at
  BEFORE UPDATE ON public.suspension_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();