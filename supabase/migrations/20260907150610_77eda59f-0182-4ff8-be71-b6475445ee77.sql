
CREATE TABLE public.alerts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  keyword_triggered text not null,
  target_name text,
  content_snippet text,
  content_url text,
  severity text not null default 'MEDIUM',
  ai_analysis text,
  status text not null default 'PENDING',
  country text,
  source text not null default 'bot',
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

CREATE UNIQUE INDEX alerts_url_keyword_uniq ON public.alerts (coalesce(content_url,''), keyword_triggered);
CREATE INDEX alerts_detected_at_idx ON public.alerts (detected_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts_staff_read" ON public.alerts FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "alerts_staff_write" ON public.alerts FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "alerts_staff_update" ON public.alerts FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "alerts_admin_delete" ON public.alerts FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.alerts_to_social_signal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE lvl text;
BEGIN
  lvl := CASE upper(NEW.severity)
    WHEN 'CRITICAL' THEN 'critical'
    WHEN 'HIGH' THEN 'high'
    WHEN 'LOW' THEN 'low'
    ELSE 'medium' END;

  INSERT INTO public.social_signals (platform, keyword, content, content_url, country, sentiment, threat_level, detected_at)
  VALUES (
    NEW.platform,
    NEW.keyword_triggered,
    COALESCE(NEW.content_snippet, NEW.target_name, NEW.keyword_triggered),
    NEW.content_url,
    COALESCE(NEW.country, 'Côte d''Ivoire'),
    CASE WHEN lvl IN ('critical','high') THEN 'negative' ELSE 'neutral' END,
    lvl,
    NEW.detected_at
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER alerts_sync_social_signal
AFTER INSERT ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.alerts_to_social_signal();
