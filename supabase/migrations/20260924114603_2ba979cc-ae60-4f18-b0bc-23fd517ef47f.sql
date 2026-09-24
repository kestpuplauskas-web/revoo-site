CREATE TYPE public.rental_kind AS ENUM ('short_term', 'long_term');

CREATE TABLE public.pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_kind public.rental_kind NOT NULL,
  min_units integer NOT NULL,
  max_units integer NOT NULL,
  unit_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pricing_tiers_range_ok CHECK (max_units >= min_units AND min_units >= 1),
  CONSTRAINT pricing_tiers_price_ok CHECK (unit_price >= 0)
);

GRANT SELECT ON public.pricing_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_tiers TO authenticated;
GRANT ALL ON public.pricing_tiers TO service_role;

ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pricing tiers are public" ON public.pricing_tiers
  FOR SELECT USING (true);
CREATE POLICY "Admins manage pricing tiers" ON public.pricing_tiers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pricing_tiers_updated_at
  BEFORE UPDATE ON public.pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  min_monthly_price numeric NOT NULL DEFAULT 79,
  currency text NOT NULL DEFAULT 'EUR',
  max_units integer NOT NULL DEFAULT 220,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pricing_settings_singleton_ok CHECK (singleton)
);

GRANT SELECT ON public.pricing_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.pricing_settings TO authenticated;
GRANT ALL ON public.pricing_settings TO service_role;

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pricing settings are public" ON public.pricing_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins manage pricing settings" ON public.pricing_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pricing_settings_updated_at
  BEFORE UPDATE ON public.pricing_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.pricing_settings (singleton, min_monthly_price, currency, max_units)
VALUES (true, 79, 'EUR', 220);

INSERT INTO public.pricing_tiers (rental_kind, min_units, max_units, unit_price)
SELECT k.kind, t.min_units, t.max_units, t.unit_price
FROM (VALUES
  (1, 10, 27), (11, 15, 19), (16, 17, 19), (18, 20, 19),
  (21, 30, 18), (31, 40, 16), (41, 50, 15), (51, 60, 15),
  (61, 80, 15), (81, 100, 15), (101, 120, 14), (121, 150, 14),
  (151, 180, 14), (181, 220, 14)
) AS t(min_units, max_units, unit_price)
CROSS JOIN (VALUES ('short_term'::public.rental_kind), ('long_term'::public.rental_kind)) AS k(kind);