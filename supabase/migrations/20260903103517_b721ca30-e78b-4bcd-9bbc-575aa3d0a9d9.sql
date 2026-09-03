-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- clients: new columns
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS building_area_sqm numeric,
  ADD COLUMN IF NOT EXISTS developer text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_date date,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS clients_next_action_date_idx ON public.clients (next_action_date);
CREATE INDEX IF NOT EXISTS clients_assigned_to_idx ON public.clients (assigned_to);

-- activity types
CREATE TYPE public.activity_kind AS ENUM ('manual', 'system');
CREATE TYPE public.activity_type AS ENUM ('call', 'email', 'meeting', 'demo', 'proposal', 'note', 'task');

CREATE TABLE public.client_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  kind activity_kind NOT NULL DEFAULT 'manual',
  activity_type activity_type,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  body text,
  field text,
  old_value text,
  new_value text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX client_activities_client_idx ON public.client_activities (client_id, occurred_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_activities TO authenticated;
GRANT ALL ON public.client_activities TO service_role;
ALTER TABLE public.client_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read activities" ON public.client_activities
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert own manual activities" ON public.client_activities
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND kind = 'manual' AND author_id = auth.uid());
CREATE POLICY "Authors update own manual activities" ON public.client_activities
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND kind = 'manual' AND author_id = auth.uid())
  WITH CHECK (kind = 'manual' AND author_id = auth.uid());
CREATE POLICY "Authors delete own manual activities" ON public.client_activities
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND kind = 'manual' AND author_id = auth.uid());

-- automatic change log
CREATE OR REPLACE FUNCTION public.clients_log_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  f text;
  oldv text;
  newv text;
  tracked text[] := ARRAY[
    'status','assigned_to','contact_name','contact_email','contact_phone',
    'units_count','next_action_date','next_action','name','website_url',
    'developer','city','country','property_type','building_area_sqm','notes','company_name'
  ];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.client_activities (client_id, kind, field, new_value, author_id, occurred_at)
    VALUES (NEW.id, 'system', 'created', NEW.name, actor, now());
    RETURN NULL;
  END IF;

  FOREACH f IN ARRAY tracked LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', f, f)
      INTO oldv, newv USING OLD, NEW;
    IF oldv IS DISTINCT FROM newv THEN
      INSERT INTO public.client_activities (client_id, kind, field, old_value, new_value, author_id, occurred_at)
      VALUES (NEW.id, 'system', f, oldv, newv, actor, now());
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE TRIGGER clients_log_changes
AFTER INSERT OR UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.clients_log_changes();

CREATE OR REPLACE FUNCTION public.clients_set_actor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(NEW.created_by, auth.uid());
  END IF;
  NEW.updated_by := coalesce(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER clients_set_actor
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.clients_set_actor();