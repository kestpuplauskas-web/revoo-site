CREATE OR REPLACE FUNCTION public.campaign_recipient_sync_client()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status IS DISTINCT FROM 'sent' THEN
    UPDATE public.clients SET status = 'contacted'
    WHERE status = 'lead'
      AND (id = NEW.client_id OR lower(contact_email) = lower(NEW.email));
  ELSIF NEW.status = 'unsubscribed' AND OLD.status IS DISTINCT FROM 'unsubscribed' THEN
    UPDATE public.clients SET status = 'unsubscribed'
    WHERE status IN ('lead','contacted')
      AND (id = NEW.client_id OR lower(contact_email) = lower(NEW.email));
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER campaign_recipient_sync_client
AFTER UPDATE OF status ON public.campaign_recipients
FOR EACH ROW EXECUTE FUNCTION public.campaign_recipient_sync_client();

CREATE OR REPLACE FUNCTION public.email_unsubscribe_sync_client()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.clients SET status = 'unsubscribed'
  WHERE lower(contact_email) = lower(NEW.email)
    AND status IN ('lead','contacted','negotiation');
  RETURN NULL;
END $$;

CREATE TRIGGER email_unsubscribe_sync_client
AFTER INSERT ON public.email_unsubscribes
FOR EACH ROW EXECUTE FUNCTION public.email_unsubscribe_sync_client();