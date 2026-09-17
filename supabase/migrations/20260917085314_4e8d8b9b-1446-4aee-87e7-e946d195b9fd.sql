CREATE TABLE public.media_slots (
  key text PRIMARY KEY,
  label text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('image','video')),
  ratio_w integer NOT NULL,
  ratio_h integer NOT NULL,
  max_width integer NOT NULL,
  used_in text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key text NOT NULL REFERENCES public.media_slots(key) ON DELETE CASCADE,
  position integer NOT NULL,
  url text NOT NULL,
  storage_path text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  mime text NOT NULL,
  poster_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX media_assets_slot_idx ON public.media_assets (slot_key, position);

GRANT SELECT ON public.media_slots TO anon, authenticated;
GRANT ALL ON public.media_slots TO service_role;

GRANT SELECT ON public.media_assets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;

ALTER TABLE public.media_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_slots public read" ON public.media_slots
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "media_assets public read active" ON public.media_assets
  FOR SELECT TO anon, authenticated
  USING (position = 0);

CREATE POLICY "media_assets admin read all" ON public.media_assets
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "media_assets admin insert" ON public.media_assets
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "media_assets admin update" ON public.media_assets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "media_assets admin delete" ON public.media_assets
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.media_slots (key, label, kind, ratio_w, ratio_h, max_width, used_in, sort_order) VALUES
  ('booking-calendar', 'Rezervacijų kalendorius', 'image', 1867, 937, 1867, 'Karuselė (2 vietos), rezervacijų sekcija, vaizdo įrašo posteris, LCP preload', 0),
  ('booking-video', 'Rezervacijų vaizdo įrašas', 'video', 1920, 1080, 1920, 'Karuselė, 1 scena', 1),
  ('housekeeping-week', 'Kambarinių savaitė', 'image', 1863, 895, 1863, 'Karuselė (2 vietos), kambarinių sekcija', 2),
  ('housekeeping-phone', 'Kambarinių telefonas', 'video', 384, 848, 1080, 'Karuselė (2 vietos), kambarinių sekcija', 3),
  ('invoice', 'Sąskaita', 'image', 1275, 1233, 1275, 'Karuselė, finansų sekcija', 4),
  ('notification', 'Pranešimas klientui', 'image', 1122, 757, 1122, 'Karuselė (2 vietos)', 5),
  ('dashboard', 'Skydelis', 'image', 1867, 862, 1867, 'Karuselė (2 vietos toje pačioje scenoje)', 6),
  ('admin-phone', 'Administravimas telefone', 'video', 384, 848, 1080, 'Karuselė, 3 scena', 7),
  ('site-calendar', 'Klientinės svetainės kalendorius', 'image', 1705, 946, 1705, 'Karuselė, klientinės svetainės sekcija', 8),
  ('site-page-1', 'Klientinės svetainės pradžia', 'image', 603, 872, 603, 'Karuselė, 4 scena', 9),
  ('site-page-2', 'Klientinės svetainės antrasis puslapis', 'image', 581, 845, 581, 'Karuselė, 4 scena', 10);

CREATE POLICY "Site media publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-media');

CREATE POLICY "Admins can upload site media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update site media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete site media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));