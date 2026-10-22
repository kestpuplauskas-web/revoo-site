ALTER TABLE public.email_campaigns ADD COLUMN interval_max_minutes integer;
ALTER TABLE public.email_senders ADD COLUMN next_send_at timestamptz;