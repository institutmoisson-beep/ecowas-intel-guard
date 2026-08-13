
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_own_write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_own_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.intelligence_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias VARCHAR(100) NOT NULL,
  full_name VARCHAR(150),
  primary_platform VARCHAR(50),
  country VARCHAR(50) NOT NULL DEFAULT 'Côte d''Ivoire',
  threat_level VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  location TEXT,
  phone TEXT,
  mobile_money TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_targets TO authenticated;
GRANT ALL ON public.intelligence_targets TO service_role;
ALTER TABLE public.intelligence_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "targets_all" ON public.intelligence_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.target_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.intelligence_targets(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.intelligence_targets(id) ON DELETE CASCADE,
  relation_type VARCHAR(50) NOT NULL DEFAULT 'linked',
  weight INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.target_relations TO authenticated;
GRANT ALL ON public.target_relations TO service_role;
ALTER TABLE public.target_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "relations_all" ON public.target_relations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.social_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword VARCHAR(100) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  author_handle VARCHAR(100),
  country VARCHAR(50),
  content TEXT NOT NULL,
  content_url TEXT,
  sentiment VARCHAR(20) NOT NULL DEFAULT 'negative',
  threat_level VARCHAR(20) NOT NULL DEFAULT 'medium',
  velocity INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_signals TO authenticated;
GRANT ALL ON public.social_signals TO service_role;
ALTER TABLE public.social_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signals_all" ON public.social_signals FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.takedown_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID REFERENCES public.intelligence_targets(id) ON DELETE SET NULL,
  platform VARCHAR(50) NOT NULL,
  content_url TEXT NOT NULL,
  notice_type VARCHAR(30) NOT NULL DEFAULT 'dmca',
  status VARCHAR(30) NOT NULL DEFAULT 'submitted',
  evidence_hash TEXT,
  legal_dossier_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.takedown_actions TO authenticated;
GRANT ALL ON public.takedown_actions TO service_role;
ALTER TABLE public.takedown_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "takedowns_all" ON public.takedown_actions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.legal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_ref VARCHAR(60) NOT NULL,
  country VARCHAR(50) NOT NULL,
  authority VARCHAR(100) NOT NULL,
  case_type VARCHAR(50) NOT NULL DEFAULT 'cybercrime_complaint',
  target_id UUID REFERENCES public.intelligence_targets(id) ON DELETE SET NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'filed',
  warrant_type VARCHAR(40),
  next_hearing DATE,
  bailiff_name TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_cases TO authenticated;
GRANT ALL ON public.legal_cases TO service_role;
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cases_all" ON public.legal_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.institutional_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  official_title VARCHAR(150) NOT NULL,
  institution VARCHAR(150),
  phone_encrypted TEXT,
  email_encrypted TEXT,
  region_jurisdiction VARCHAR(100),
  influence_level VARCHAR(20) NOT NULL DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutional_directory TO authenticated;
GRANT ALL ON public.institutional_directory TO service_role;
ALTER TABLE public.institutional_directory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "directory_all" ON public.institutional_directory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.lobbying_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.institutional_directory(id) ON DELETE SET NULL,
  country VARCHAR(50) NOT NULL,
  engagement_type VARCHAR(50) NOT NULL DEFAULT 'institutional_visit',
  title VARCHAR(150) NOT NULL,
  stage VARCHAR(40) NOT NULL DEFAULT 'planned',
  scheduled_for DATE,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lobbying_engagements TO authenticated;
GRANT ALL ON public.lobbying_engagements TO service_role;
ALTER TABLE public.lobbying_engagements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lobbying_all" ON public.lobbying_engagements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Demo data
INSERT INTO public.intelligence_targets (id, alias, full_name, primary_platform, country, threat_level, status, location, phone, mobile_money, notes, metadata) VALUES
('11111111-1111-1111-1111-111111111101','@LeJusticierCI','Kouassi Yao Marc','TikTok','Côte d''Ivoire','critical','active','Abidjan, Yopougon','+225 07 00 11 22','Orange Money +225 07 00 11 22','Orchestrateur présumé de la campagne de dénigrement.','{"handles":["tiktok.com/@lejusticierci","facebook.com/lejusticier.ci"],"ips":["102.176.44.12"]}'),
('11111111-1111-1111-1111-111111111102','@AlertArnaque228','Komlan Doe','Facebook','Togo','high','active','Lomé','+228 90 44 55 66','TMoney +228 90 44 55 66','Relais principal des lives virales.','{"handles":["facebook.com/alertarnaque228"]}'),
('11111111-1111-1111-1111-111111111103','@QnetWatch','Inconnu','YouTube','Bénin','medium','monitoring','Cotonou',NULL,NULL,'Chaîne de compilation de vidéos.','{"handles":["youtube.com/@qnetwatch"]}'),
('11111111-1111-1111-1111-111111111104','@FinanceurX','Non identifié','Telegram','Nigeria','critical','active','Lagos','+234 80 33 22 11','MoMo +234 80 33 22 11','Source de financement suspectée.','{"ips":["197.210.65.9"]}'),
('11111111-1111-1111-1111-111111111105','@VoixDuPeupleBF','Ouédraogo Salif','TikTok','Burkina Faso','low','archived','Ouagadougou',NULL,NULL,'Compte à faible portée.','{}');

INSERT INTO public.target_relations (source_id, target_id, relation_type, weight) VALUES
('11111111-1111-1111-1111-111111111104','11111111-1111-1111-1111-111111111101','funding',5),
('11111111-1111-1111-1111-111111111101','11111111-1111-1111-1111-111111111102','coordination',4),
('11111111-1111-1111-1111-111111111102','11111111-1111-1111-1111-111111111103','content_reuse',2),
('11111111-1111-1111-1111-111111111101','11111111-1111-1111-1111-111111111105','shared_ip',1);

INSERT INTO public.social_signals (keyword, platform, author_handle, country, content, content_url, sentiment, threat_level, velocity, reach) VALUES
('Ignite','TikTok','@LeJusticierCI','Côte d''Ivoire','Live accusant Ignite d''arnaque pyramidale, 12k spectateurs.','https://tiktok.com/@lejusticierci/live','negative','critical',420,128000),
('Arnaque','Facebook','@AlertArnaque228','Togo','Publication virale reprenant de fausses attestations.','https://facebook.com/post/1','negative','high',180,54000),
('Qnet','YouTube','@QnetWatch','Bénin','Compilation vidéo comparative.','https://youtube.com/watch?v=x','neutral','medium',60,17000),
('Plainte','X','@citoyen_ci','Côte d''Ivoire','Appel au dépôt de plaintes collectives.','https://x.com/status/1','negative','high',210,32000),
('Ignite','Facebook','@business_abj','Côte d''Ivoire','Témoignage positif sur la formation Ignite.','https://facebook.com/post/2','positive','low',15,8000);

INSERT INTO public.takedown_actions (target_id, platform, content_url, notice_type, status, evidence_hash, notes) VALUES
('11111111-1111-1111-1111-111111111101','TikTok','https://tiktok.com/@lejusticierci/video/1','defamation','in_review','SHA256:9f2c...a11','Notice envoyée via TikTok IP Protection.'),
('11111111-1111-1111-1111-111111111102','Meta','https://facebook.com/post/1','dmca','taken_down','SHA256:71ab...c04','Contenu retiré sous 48h.'),
('11111111-1111-1111-1111-111111111103','YouTube','https://youtube.com/watch?v=x','copyright','submitted','SHA256:33de...9f1','En attente de revue YouTube Safety.');

INSERT INTO public.legal_cases (case_ref, country, authority, case_type, target_id, status, warrant_type, next_hearing, bailiff_name, summary) VALUES
('PLCC-2026-0148','Côte d''Ivoire','PLCC Abidjan','cybercrime_complaint','11111111-1111-1111-1111-111111111101','under_investigation','notice_rouge','2026-09-04','Me Adjoua Konan','Plainte pour diffamation et atteinte à l''image de marque.'),
('CNIN-2026-0032','Bénin','CNIN Cotonou','cybercrime_complaint','11111111-1111-1111-1111-111111111103','filed',NULL,'2026-08-28','Me Sossou','Signalement de chaîne diffamatoire.'),
('CLCT-2026-0011','Burkina Faso','CLCT Ouagadougou','defamation','11111111-1111-1111-1111-111111111105','closed',NULL,NULL,NULL,'Dossier clos, faible portée.');

INSERT INTO public.institutional_directory (id, country, category, full_name, official_title, institution, phone_encrypted, email_encrypted, region_jurisdiction, influence_level, notes) VALUES
('22222222-2222-2222-2222-222222222201','Côte d''Ivoire','prosecutor','Dr. Aka Konan','Procureur de la République','Tribunal d''Abidjan Plateau','enc::+225********','enc::a.konan@***','Abidjan','critical','Réceptif aux dossiers cybercriminalité.'),
('22222222-2222-2222-2222-222222222202','Côte d''Ivoire','commander','Cdt. Bamba Issa','Chef d''unité PLCC','Police Nationale','enc::+225********','enc::b.issa@***','Abidjan','high','Point de contact opérationnel.'),
('22222222-2222-2222-2222-222222222203','Sénégal','minister','Mme. Fatou Diagne','Ministre de l''Économie Numérique','Gouvernement','enc::+221********','enc::f.diagne@***','Dakar','critical','Rencontre lobbying prévue.'),
('22222222-2222-2222-2222-222222222204','Bénin','judge','M. Codjo Alavo','Juge d''instruction','Tribunal de Cotonou','enc::+229********','enc::c.alavo@***','Cotonou','medium',NULL),
('22222222-2222-2222-2222-222222222205','Ghana','media_director','Mr. Kwame Mensah','Director, National Media Group','Ghana Media Group','enc::+233********','enc::k.mensah@***','Accra','high','Relais média favorable.'),
('22222222-2222-2222-2222-222222222206','Mali','chief','Chef Amadou Traoré','Chef de village','Communauté de Kati','enc::+223********',NULL,'Kati','low',NULL);

INSERT INTO public.lobbying_engagements (contact_id, country, engagement_type, title, stage, scheduled_for, outcome) VALUES
('22222222-2222-2222-2222-222222222203','Sénégal','institutional_visit','Visite ministérielle - conformité numérique','scheduled','2026-09-12',NULL),
('22222222-2222-2222-2222-222222222201','Côte d''Ivoire','whitepaper','Livre blanc anti-désinformation CEDEAO','delivered','2026-07-20','Accueil favorable, suivi trimestriel.'),
('22222222-2222-2222-2222-222222222205','Ghana','media_briefing','Briefing presse régional','planned',NULL,NULL);
