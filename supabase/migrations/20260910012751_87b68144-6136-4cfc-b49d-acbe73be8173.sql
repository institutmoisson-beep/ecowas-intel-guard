CREATE TABLE public.publication_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL,
  post_url text NOT NULL,
  author_handle text,
  raw_content text,
  summary text,
  defamatory_excerpts jsonb NOT NULL DEFAULT '[]'::jsonb,
  extracted_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'MEDIUM',
  primary_analysis text,
  secondary_analysis text,
  primary_model text,
  secondary_model text,
  status text NOT NULL DEFAULT 'ANALYZED',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_scans TO authenticated;
GRANT ALL ON public.publication_scans TO service_role;

ALTER TABLE public.publication_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "publication_scans_staff" ON public.publication_scans
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

CREATE INDEX publication_scans_created_at_idx ON public.publication_scans (created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_publication_scans_updated_at
  BEFORE UPDATE ON public.publication_scans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();