CREATE TABLE public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  event text not null,
  path text,
  details jsonb not null default '{}'::jsonb,
  user_agent text,
  platform text,
  language text,
  timezone text,
  screen text,
  device_memory numeric,
  cpu_cores integer,
  network text,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  session_id text,
  created_at timestamptz not null default now()
);

CREATE INDEX user_activity_created_at_idx ON public.user_activity (created_at DESC);
CREATE INDEX user_activity_user_idx ON public.user_activity (user_id);

GRANT SELECT, INSERT ON public.user_activity TO authenticated;
GRANT ALL ON public.user_activity TO service_role;

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own activity"
ON public.user_activity FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all activity"
ON public.user_activity FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete activity"
ON public.user_activity FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

GRANT DELETE ON public.user_activity TO authenticated;