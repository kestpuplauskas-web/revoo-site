-- ENUMS
CREATE TYPE public.client_status AS ENUM ('lead','negotiation','onboarding','active','paused','cancelled');
CREATE TYPE public.project_status AS ENUM ('planning','development','onboarding','active','paused','cancelled');
CREATE TYPE public.currency_code AS ENUM ('EUR','USD','GBP','PLN','ISK','OTHER');
CREATE TYPE public.ticket_category AS ENUM ('bug','question','feature_request','configuration','content','billing','technical','other');
CREATE TYPE public.ticket_priority AS ENUM ('low','normal','high','urgent');
CREATE TYPE public.ticket_status AS ENUM ('new','in_progress','waiting_for_client','resolved','closed');
CREATE TYPE public.time_category AS ENUM ('support','development','onboarding','maintenance','meeting','other');
CREATE TYPE public.payment_type AS ENUM ('setup','subscription','additional','refund');
CREATE TYPE public.payment_status AS ENUM ('pending','paid','overdue','cancelled');

-- shared updated_at trigger fn (already exists as posts_before_write for posts; create generic one)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- CLIENTS
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text,
  country text,
  city text,
  property_type text,
  units_count integer CHECK (units_count IS NULL OR units_count >= 0),
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  status public.client_status NOT NULL DEFAULT 'lead',
  source_lead_id uuid UNIQUE REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage clients" ON public.clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX clients_status_idx ON public.clients(status);
CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROJECTS
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  project_name text NOT NULL,
  website_url text,
  lovable_url text,
  github_url text,
  supabase_url text,
  launch_date date,
  project_status public.project_status NOT NULL DEFAULT 'planning',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage projects" ON public.projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX projects_client_id_idx ON public.projects(client_id);
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CLIENT CONTRACTS
CREATE TABLE public.client_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  setup_fee numeric CHECK (setup_fee IS NULL OR setup_fee >= 0),
  monthly_subscription numeric CHECK (monthly_subscription IS NULL OR monthly_subscription >= 0),
  currency public.currency_code NOT NULL DEFAULT 'EUR',
  next_payment_date date,
  contract_start_date date,
  contract_end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_contracts TO authenticated;
GRANT ALL ON public.client_contracts TO service_role;
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contracts" ON public.client_contracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER client_contracts_set_updated_at BEFORE UPDATE ON public.client_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ADMIN SETTINGS (single row)
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_hourly_internal_cost numeric NOT NULL DEFAULT 0 CHECK (default_hourly_internal_cost >= 0),
  base_currency public.currency_code NOT NULL DEFAULT 'EUR',
  updated_at timestamptz NOT NULL DEFAULT now(),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton)
);
GRANT SELECT, INSERT, UPDATE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage settings" ON public.admin_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER admin_settings_set_updated_at BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.admin_settings (default_hourly_internal_cost, base_currency) VALUES (0, 'EUR');

-- SUPPORT TICKETS
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category public.ticket_category NOT NULL DEFAULT 'other',
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  status public.ticket_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  internal_notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX support_tickets_client_status_idx ON public.support_tickets(client_id, status);

-- TIME ENTRIES
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  support_ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  category public.time_category NOT NULL DEFAULT 'other',
  description text,
  hourly_internal_cost numeric CHECK (hourly_internal_cost IS NULL OR hourly_internal_cost >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage time entries" ON public.time_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX time_entries_client_date_idx ON public.time_entries(client_id, entry_date);

CREATE OR REPLACE FUNCTION public.time_entries_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.entry_date > (now() AT TIME ZONE 'Europe/Vilnius')::date THEN
    RAISE EXCEPTION 'Laiko įrašo data negali būti ateityje';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER time_entries_validate BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.time_entries_validate();

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency public.currency_code NOT NULL DEFAULT 'EUR',
  payment_type public.payment_type NOT NULL,
  payment_date date NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  invoice_number text UNIQUE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX payments_client_status_idx ON public.payments(client_id, status);