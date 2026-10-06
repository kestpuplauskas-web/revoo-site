-- lovable-cron-fallback-reviewed: throttled campaign sending must spread mail across the day; job is created only while a campaign is running and removed when none remain
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.campaigns_cron_ensure()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF EXISTS (SELECT 1 FROM public.email_campaigns WHERE status = 'running') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'campaigns-tick') THEN
      PERFORM cron.schedule('campaigns-tick', '* * * * *', $job$
        SELECT net.http_post(
          url := 'https://project--a63402a7-1c2a-4b1f-8c10-d1993bc0cbfe.lovable.app/api/public/campaigns/tick',
          headers := jsonb_build_object('Content-Type','application/json','x-tick-token',(SELECT tick_token FROM public.campaign_runtime WHERE singleton)),
          body := '{}'::jsonb
        )
      $job$);
    END IF;
  ELSIF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'campaigns-tick') THEN
    PERFORM cron.unschedule('campaigns-tick');
  END IF;
END;
$fn$;
REVOKE ALL ON FUNCTION public.campaigns_cron_ensure() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campaigns_cron_ensure() TO service_role;

CREATE OR REPLACE FUNCTION public.email_campaigns_status_cron()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  PERFORM public.campaigns_cron_ensure();
  RETURN NULL;
END;
$fn$;
CREATE TRIGGER email_campaigns_status_cron
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.email_campaigns
  FOR EACH STATEMENT EXECUTE FUNCTION public.email_campaigns_status_cron();