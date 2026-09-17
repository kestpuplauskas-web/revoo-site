CREATE TABLE public.homepage_copy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lang TEXT NOT NULL CHECK (lang IN ('en','lt')),
  path TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (lang, path)
);

GRANT SELECT ON public.homepage_copy TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_copy TO authenticated;
GRANT ALL ON public.homepage_copy TO service_role;

ALTER TABLE public.homepage_copy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read homepage copy" ON public.homepage_copy
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage homepage copy" ON public.homepage_copy
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));