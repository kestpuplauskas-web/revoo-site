-- lovable-cron-fallback-reviewed: per-minute tick runs only while a scrape job is running; unscheduled automatically when none run (same as campaigns)
CREATE TABLE public.scrape_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target integer NOT NULL CHECK (target BETWEEN 1 AND 20000),
  countries text[] NOT NULL DEFAULT '{}',
  city text,
  category text NOT NULL DEFAULT 'accommodation',
  phrases text[] NOT NULL DEFAULT '{}',
  start_urls text[] NOT NULL DEFAULT '{}',
  max_pages integer NOT NULL DEFAULT 5 CHECK (max_pages BETWEEN 1 AND 20),
  rescan boolean NOT NULL DEFAULT false,
  contact_types text[] NOT NULL DEFAULT '{all}',
  status text NOT NULL DEFAULT 'running',
  status_reason text,
  discovery jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_count integer NOT NULL DEFAULT 0,
  found_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  discovered_count integer NOT NULL DEFAULT 0,
  sites_done integer NOT NULL DEFAULT 0,
  sites_failed integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrape_jobs TO authenticated;
GRANT ALL ON public.scrape_jobs TO service_role;
ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage scrape jobs" ON public.scrape_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.scrape_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.scrape_jobs(id) ON DELETE CASCADE,
  domain text NOT NULL,
  url text NOT NULL,
  company_name text,
  country text,
  city text,
  source text NOT NULL,
  known_email text,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  error text,
  emails_found integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (job_id, domain)
);
CREATE INDEX scrape_sites_queue_idx ON public.scrape_sites (status, next_attempt_at);
CREATE INDEX scrape_sites_domain_idx ON public.scrape_sites (domain, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrape_sites TO authenticated;
GRANT ALL ON public.scrape_sites TO service_role;
ALTER TABLE public.scrape_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage scrape sites" ON public.scrape_sites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.scrape_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_lower text GENERATED ALWAYS AS (lower(email)) STORED UNIQUE,
  company_name text,
  domain text,
  country text,
  city text,
  category text,
  contact_type text NOT NULL DEFAULT 'general',
  source_url text,
  job_id uuid REFERENCES public.scrape_jobs(id) ON DELETE SET NULL,
  syntax_ok boolean NOT NULL DEFAULT true,
  mx_status text NOT NULL DEFAULT 'unknown',
  confidence text NOT NULL DEFAULT 'medium',
  check_method text NOT NULL DEFAULT 'syntax+mx',
  imported_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scrape_contacts_job_idx ON public.scrape_contacts (job_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrape_contacts TO authenticated;
GRANT ALL ON public.scrape_contacts TO service_role;
ALTER TABLE public.scrape_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage scrape contacts" ON public.scrape_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.scrape_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.scrape_jobs(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scrape_job_logs_job_idx ON public.scrape_job_logs (job_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.scrape_job_logs TO authenticated;
GRANT ALL ON public.scrape_job_logs TO service_role;
ALTER TABLE public.scrape_job_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read scrape logs" ON public.scrape_job_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.scrape_runtime (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  tick_token text NOT NULL DEFAULT (md5(random()::text) || md5(random()::text))
);
GRANT ALL ON public.scrape_runtime TO service_role;
ALTER TABLE public.scrape_runtime ENABLE ROW LEVEL SECURITY;
INSERT INTO public.scrape_runtime (singleton) VALUES (true);

CREATE OR REPLACE FUNCTION public.scrape_add_contact(
  _job uuid, _email text, _company text, _domain text, _country text, _city text,
  _category text, _type text, _source text, _mx text, _confidence text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j record; inserted uuid;
BEGIN
  SELECT * INTO j FROM public.scrape_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR j.status <> 'running' THEN RETURN 'stopped'; END IF;
  IF j.new_count >= j.target THEN RETURN 'full'; END IF;
  UPDATE public.scrape_jobs SET found_count = found_count + 1, last_activity_at = now() WHERE id = _job;
  IF EXISTS (SELECT 1 FROM public.clients WHERE lower(contact_email) = lower(_email)) THEN
    UPDATE public.scrape_jobs SET duplicate_count = duplicate_count + 1 WHERE id = _job;
    RETURN 'duplicate';
  END IF;
  INSERT INTO public.scrape_contacts (email, company_name, domain, country, city, category, contact_type, source_url, job_id, mx_status, confidence)
  VALUES (lower(_email), _company, _domain, _country, _city, _category, _type, _source, _job, _mx, _confidence)
  ON CONFLICT (email_lower) DO NOTHING RETURNING id INTO inserted;
  IF inserted IS NULL THEN
    UPDATE public.scrape_contacts SET company_name = coalesce(company_name, _company), city = coalesce(city, _city)
      WHERE email_lower = lower(_email);
    UPDATE public.scrape_jobs SET duplicate_count = duplicate_count + 1 WHERE id = _job;
    RETURN 'duplicate';
  END IF;
  UPDATE public.scrape_jobs SET new_count = new_count + 1,
    status = CASE WHEN new_count + 1 >= target THEN 'completed' ELSE status END,
    finished_at = CASE WHEN new_count + 1 >= target THEN now() ELSE finished_at END,
    status_reason = CASE WHEN new_count + 1 >= target THEN 'Tikslas pasiektas' ELSE status_reason END
  WHERE id = _job;
  RETURN 'new';
END $$;
REVOKE EXECUTE ON FUNCTION public.scrape_add_contact(uuid,text,text,text,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scrape_add_contact(uuid,text,text,text,text,text,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.scrape_claim_sites(_limit integer)
RETURNS SETOF public.scrape_sites LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.scrape_sites s SET status = 'processing', attempts = s.attempts + 1,
    locked_until = now() + interval '3 minutes'
  WHERE s.id IN (
    SELECT x.id FROM public.scrape_sites x JOIN public.scrape_jobs j ON j.id = x.job_id
    WHERE j.status = 'running'
      AND ((x.status = 'queued' AND x.next_attempt_at <= now())
        OR (x.status = 'processing' AND x.locked_until < now()))
    ORDER BY x.next_attempt_at
    LIMIT _limit
    FOR UPDATE OF x SKIP LOCKED
  ) RETURNING s.*;
$$;
REVOKE EXECUTE ON FUNCTION public.scrape_claim_sites(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scrape_claim_sites(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.scrape_cron_ensure() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.scrape_jobs WHERE status = 'running') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scrape-tick') THEN
      PERFORM cron.schedule('scrape-tick', '* * * * *', $job$
        SELECT net.http_post(
          url := 'https://project--a63402a7-1c2a-4b1f-8c10-d1993bc0cbfe.lovable.app/api/public/scrape/tick',
          headers := jsonb_build_object('Content-Type','application/json','x-tick-token',(SELECT tick_token FROM public.scrape_runtime WHERE singleton)),
          body := '{}'::jsonb,
          timeout_milliseconds := 60000
        )
      $job$);
    END IF;
  ELSIF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scrape-tick') THEN
    PERFORM cron.unschedule('scrape-tick');
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.scrape_jobs_status_cron() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.scrape_cron_ensure(); RETURN NULL; END $$;
CREATE TRIGGER scrape_jobs_cron AFTER INSERT OR DELETE OR UPDATE OF status ON public.scrape_jobs
FOR EACH STATEMENT EXECUTE FUNCTION public.scrape_jobs_status_cron();