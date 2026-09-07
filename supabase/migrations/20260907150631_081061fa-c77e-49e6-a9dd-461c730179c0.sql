
DROP TRIGGER IF EXISTS alerts_sync_social_signal ON public.alerts;
DROP FUNCTION IF EXISTS public.alerts_to_social_signal();

CREATE OR REPLACE FUNCTION private.alerts_to_social_signal()
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

REVOKE ALL ON FUNCTION private.alerts_to_social_signal() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER alerts_sync_social_signal
AFTER INSERT ON public.alerts
FOR EACH ROW EXECUTE FUNCTION private.alerts_to_social_signal();
