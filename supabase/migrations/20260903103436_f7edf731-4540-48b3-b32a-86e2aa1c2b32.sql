ALTER TYPE public.client_status ADD VALUE IF NOT EXISTS 'contacted';
ALTER TYPE public.client_status ADD VALUE IF NOT EXISTS 'awaiting_reply';
ALTER TYPE public.client_status ADD VALUE IF NOT EXISTS 'replied';
ALTER TYPE public.client_status ADD VALUE IF NOT EXISTS 'demo_scheduled';
ALTER TYPE public.client_status ADD VALUE IF NOT EXISTS 'proposal_sent';
ALTER TYPE public.client_status ADD VALUE IF NOT EXISTS 'won';
ALTER TYPE public.client_status ADD VALUE IF NOT EXISTS 'lost';