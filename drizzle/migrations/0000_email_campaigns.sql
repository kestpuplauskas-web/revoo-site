CREATE TABLE public.email_senders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  from_name text NOT NULL DEFAULT 'Revoo',
  daily_limit integer NOT NULL DEFAULT 40 CHECK (daily_limit BETWEEN 1 AND 5000),
  is_active boolean NOT NULL DEFAULT true,
  sent_today integer NOT NULL DEFAULT 0,
  sent_day date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_senders TO authenticated;
GRANT ALL ON public.email_senders TO service_role;
ALTER TABLE public.email_senders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage senders" ON public.email_senders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  daily_limit integer NOT NULL DEFAULT 300 CHECK (daily_limit BETWEEN 1 AND 20000),
  per_minute integer NOT NULL DEFAULT 5 CHECK (per_minute BETWEEN 1 AND 30),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','paused','completed','cancelled')),
  sent_today integer NOT NULL DEFAULT 0,
  sent_day date,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage campaigns" ON public.email_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER email_campaigns_set_updated_at BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','skipped','unsubscribed')),
  sender_id uuid REFERENCES public.email_senders(id) ON DELETE SET NULL,
  sent_at timestamptz,
  error text,
  provider_message_id text,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);
CREATE INDEX campaign_recipients_pending_idx ON public.campaign_recipients (campaign_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_recipients TO authenticated;
GRANT ALL ON public.campaign_recipients TO service_role;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage recipients" ON public.campaign_recipients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.email_unsubscribes (
  email text PRIMARY KEY,
  reason text NOT NULL DEFAULT 'unsubscribe',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_unsubscribes TO authenticated;
GRANT ALL ON public.email_unsubscribes TO service_role;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage unsubscribes" ON public.email_unsubscribes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.campaign_runtime (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  tick_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  last_tick_at timestamptz
);
GRANT ALL ON public.campaign_runtime TO service_role;
ALTER TABLE public.campaign_runtime ENABLE ROW LEVEL SECURITY;
INSERT INTO public.campaign_runtime (singleton) SELECT true WHERE NOT EXISTS (SELECT 1 FROM public.campaign_runtime);