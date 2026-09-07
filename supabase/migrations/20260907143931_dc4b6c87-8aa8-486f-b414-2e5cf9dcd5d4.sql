
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','analyst'));
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM public;
REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM public;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated, service_role;

ALTER POLICY profiles_read_own ON public.profiles USING ((auth.uid() = id) OR private.has_role(auth.uid(), 'admin'));
ALTER POLICY targets_staff ON public.intelligence_targets USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
ALTER POLICY relations_staff ON public.target_relations USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
ALTER POLICY signals_staff ON public.social_signals USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
ALTER POLICY takedowns_staff ON public.takedown_actions USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
ALTER POLICY cases_staff ON public.legal_cases USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
ALTER POLICY directory_staff ON public.institutional_directory USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
ALTER POLICY lobbying_staff ON public.lobbying_engagements USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
ALTER POLICY user_roles_admin_manage ON public.user_roles USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY user_roles_read_own ON public.user_roles USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_staff(uuid);
