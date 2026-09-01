CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lang text NOT NULL CHECK (lang IN ('en','lt')),
  slug text NOT NULL,
  translation_group text,
  title text NOT NULL,
  h1 text NOT NULL,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  excerpt text NOT NULL,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_image text,
  cover_alt text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  reading_time integer NOT NULL DEFAULT 1,
  published_at date NOT NULL DEFAULT (now()::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lang, slug)
);

CREATE INDEX posts_public_idx ON public.posts (status, lang, published_at DESC);
CREATE INDEX posts_group_idx ON public.posts (translation_group);

GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published posts are public" ON public.posts
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Admins can read all posts" ON public.posts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete posts" ON public.posts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.posts_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  words integer;
BEGIN
  SELECT coalesce(sum(array_length(regexp_split_to_array(trim(txt), '\s+'), 1)), 0)
  INTO words
  FROM (
    SELECT coalesce(b->>'text', '') AS txt FROM jsonb_array_elements(NEW.blocks) AS b
    UNION ALL
    SELECT coalesce(item #>> '{}', '') FROM jsonb_array_elements(NEW.blocks) AS b,
      LATERAL jsonb_array_elements(coalesce(b->'items', '[]'::jsonb)) AS item
  ) s
  WHERE trim(txt) <> '';

  NEW.reading_time := greatest(1, ceil(words / 200.0))::int;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER posts_before_write
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.posts_before_write();

INSERT INTO public.posts
  (lang, slug, translation_group, title, h1, meta_title, meta_description, excerpt, blocks, status, published_at, updated_at)
VALUES
  ('en', 'software-for-small-properties-in-iceland', NULL, 'Running a small property in Iceland: what to look for in booking and management software', 'Running a small property in Iceland: what to look for in booking and management software', 'Choosing property management software in Iceland — what actually matters', 'What Icelandic hotels, guesthouses and cabins should look for in a PMS and booking system — invoicing rules, VSK rates, turnover, and reducing OTA commission.', 'Invoicing rules, VSK rates, turnover and OTA commission — the questions worth asking before the demo, not after it.', '[{"type":"p","text":"Most accommodation businesses in Iceland are not chains. They are a guesthouse with fourteen rooms, a cluster of cabins, a small hotel outside Reykjavík, or a handful of apartments let by one owner. They run on a website, a booking calendar, Booking.com, a bank, a spreadsheet and email — and the software industry mostly sells to somebody larger."},{"type":"p","text":"If you are choosing a system this season, here is what is worth checking before the demo, and what tends to be discovered afterwards."},{"type":"h2","text":"Start with the invoice, not the calendar"},{"type":"p","text":"Every property management system has a calendar. Not every one produces an invoice your accountant will accept."},{"type":"p","text":"In Iceland an invoice has to carry both parties'' kennitala, the seller''s VSK number, a description of what was sold, and a pre-assigned sequential number. Gaps in that sequence attract attention, so the numbering has to be claimed by the system rather than typed in by a person. Records are kept for seven years."},{"type":"p","text":"There is a second detail that international software regularly gets wrong. Accommodation is taxed at the reduced VSK rate of 11 per cent, while most other things are at the standard 24 per cent. If your property sells anything besides the room — and most do — a single stay can produce one invoice carrying two different rates. Software that stores one tax rate per invoice cannot represent that correctly."},{"type":"p","text":"Ask the vendor directly: can a single invoice carry two VAT rates on different lines? It is a short question and the answer is revealing."},{"type":"h2","text":"Turnover is the operational problem, not occupancy"},{"type":"p","text":"Occupancy is a number you look at afterwards. Turnover is the thing that goes wrong on the day."},{"type":"p","text":"A property with scattered cabins or apartments has a harder version of this problem than a hotel corridor does. Someone has to know which units are being vacated this morning, which of those have an arrival the same afternoon, which need a full clean and which need preparing, and what the guest ordered in advance."},{"type":"p","text":"Most small properties solve this with a WhatsApp group and a good memory. It works until it is August, five cabins turn over on the same day, and one of them quietly does not get done."},{"type":"p","text":"The question worth asking of any system: does it work out the day''s work from the bookings by itself, or does somebody still have to decide and type it in? And if a unit was not finished yesterday, does it stay on the list — or does it disappear because there is no booking event today to put it there?"},{"type":"h2","text":"Direct bookings are worth more than the commission you save"},{"type":"p","text":"OTA commission is the obvious number. It is real, and for a property with strong seasonality it is a significant amount of money leaving every summer."},{"type":"p","text":"But the less obvious part matters more. A direct booking gives you the guest''s email address, the ability to sell what you offer alongside the room, and a relationship you can bring back next season. An OTA booking gives you a guest who belongs to the OTA."},{"type":"p","text":"Realistically, no system will move all your bookings direct. Anyone who promises that is selling something. But a booking website that actually takes bookings — rather than a widget that sends the guest somewhere else halfway through — moves a meaningful share of them, and those keep their full value."},{"type":"h2","text":"A widget is not a website"},{"type":"p","text":"This is the difference most vendor comparisons miss."},{"type":"p","text":"Most systems give you an embeddable booking box. You paste it into whatever website you already have. It looks borrowed, because it is: different typography, different spacing, sometimes a different language, and often an iframe that mobile browsers handle badly."},{"type":"p","text":"The alternative is a booking website that is your website — your design, your domain, your words — with the reservation logic behind it rather than bolted onto it. For a property whose photographs are its main sales tool, that difference shows up in the conversion rate."},{"type":"h2","text":"Payments in Iceland are local"},{"type":"p","text":"Do not assume a system with “Stripe” on the feature list solves this. Many Icelandic properties already have a relationship with a local acquirer, and switching that relationship is not a small administrative task."},{"type":"p","text":"What matters is whether the software can connect to what you already use, rather than requiring you to adopt what it already supports."},{"type":"h2","text":"A short checklist for the demo"},{"type":"p","text":"Ask these five, and ask them early:"},{"type":"ol","items":["Can one invoice carry both the 11 per cent and the 24 per cent rate on different lines?","Does the system work out the day''s cleaning from the bookings, without anyone entering it?","If a unit was not cleaned yesterday, is it still on today''s list?","Is the booking flow part of my website, or an embedded box inside it?","Can it connect to the payment provider I already have a contract with?"]},{"type":"p","text":"Any vendor who cannot answer those in plain language is going to be a difficult partner in October."},{"type":"h2","text":"Where Revoo fits"},{"type":"p","text":"Revoo is a property management system and a booking website for independent hotels, cabins, guesthouses and apartments. It is not an off-the-shelf subscription: every property gets the shared platform plus an implementation built around how it actually operates — including its own booking website, its payment provider and its country''s invoicing rules."},{"type":"p","text":"We work with a small number of properties at a time, which is why there is no sign-up button on this site. If you would like to see whether it fits yours, the next step is a 45-minute conversation."}]'::jsonb, 'published', '2026-08-20'::date, '2026-08-20'::timestamptz),
  ('lt', 'apgyvendinimo-pvm-2026', NULL, 'Apgyvendinimo paslaugų PVM nuo 2026: kas pasikeitė ir ką tai reiškia jūsų sąskaitoms', 'Apgyvendinimo paslaugų PVM nuo 2026: kas pasikeitė ir ką tai reiškia jūsų sąskaitoms', 'Apgyvendinimo paslaugų PVM nuo 2026: 12 % tarifas ir ką tai reiškia sąskaitoms', 'Nuo 2026 m. apgyvendinimui taikomas 12 % PVM vietoje 9 %. Kas įeina į lengvatą, kas ne, kodėl lemia rezervacijos data ir ką tai reiškia viešbučio sąskaitoms.', '12 % vietoje 9 %, pereinamojo laikotarpio taisyklė ir kodėl viena sąskaita gali turėti dvi PVM normas.', '[{"type":"p","text":"Nuo 2026 m. sausio 1 d. apgyvendinimo paslaugoms Lietuvoje taikomas lengvatinis 12 procentų PVM tarifas. Iki tol galiojo 9 procentai."},{"type":"p","text":"Skambant tai atrodo kaip vienas skaičius nustatymuose. Praktikoje tai trys atskiri dalykai, ir bent vienas iš jų nustebina beveik kiekvieną objektą."},{"type":"h2","text":"1. Lemia rezervacijos data, ne atvykimo"},{"type":"p","text":"Tai svarbiausia pereinamojo laikotarpio taisyklė ir dažniausia klaidos vieta."},{"type":"p","text":"Jei rezervacija atlikta iki 2025 m. gruodžio 31 d., jai taikomas 9 % tarifas — net jei svečias atvyksta ir apmoka jau 2026 metais. Vasarą priimta rezervacija kitų metų sezonui gyvena pagal seną tarifą."},{"type":"p","text":"Praktinė pasekmė: kurį laiką jūsų sistemoje vienu metu egzistuoja rezervacijos su dviem skirtingais tarifais. Jei sistema tarifą ima iš vieno bendro nustatymo ir pritaiko jį visoms sąskaitoms, dalis sąskaitų bus išrašytos neteisingai — tyliai, be jokio įspėjimo."},{"type":"h2","text":"2. Pusryčiai įeina, SPA neįeina"},{"type":"p","text":"Čia daugiausiai painiavos."},{"type":"p","text":"Pusryčiai pagal turizmo įstatymą laikomi apgyvendinimo paslaugos dalimi. Todėl jiems taikomas tas pats lengvatinis 12 % tarifas — nesvarbu, ar kaina įskaičiuota į nakvynę, ar nurodyta atskirai."},{"type":"p","text":"Bet ne viskas, ką parduodate svečiui, patenka į lengvatą. Standartinis 21 % tarifas taikomas, be kita ko:"},{"type":"ul","items":["SPA ir sveikatingumo paslaugoms","sporto salei","vandens pramogoms","inventoriaus nuomai","kelionių organizavimo paslaugoms"]},{"type":"p","text":"Vadinasi, objektas, turintis pirtį, kubilą ar SPA zoną, viename svečio apsilankyme parduoda paslaugas dviem skirtingais PVM tarifais."},{"type":"h2","text":"3. Viena sąskaita, dvi PVM normos"},{"type":"p","text":"Iš dviejų punktų aukščiau seka išvada, kuri liečia programinę įrangą tiesiogiai."},{"type":"p","text":"Svečias, kuris tris naktis nakvojo ir vieną vakarą nuomojosi pirtį, turi gauti sąskaitą, kurioje nakvynės eilutėms taikomas 12 %, o pirties eilutei — 21 %. Bendra suma, PVM suma ir suma be PVM turi būti apskaičiuotos atitinkamai."},{"type":"p","text":"Daug rezervacijų sistemų to nemoka. Jos saugo vieną PVM tarifą visai sąskaitai ir jį pritaiko visoms eilutėms. Su vien nakvyne to pakanka. Su pirtimi — ne."},{"type":"p","text":"Jei jūsų objektas parduoda ką nors, kas nepatenka į lengvatą, verta atsidaryti paskutinę išrašytą sąskaitą ir pasitikrinti, ar visoms eilutėms nurodytas tas pats procentas. Jei taip — turite problemą, kurios anksčiau galėjo ir nebūti, nes kol tarifas buvo 9 %, o objektas pardavinėjo tik nakvynę, klausimas nekildavo."},{"type":"h2","text":"Ką turėtų mokėti sistema"},{"type":"p","text":"Trys reikalavimai, kuriuos verta pasitikrinti savo dabartinėje sistemoje arba paklausti bet kurio tiekėjo:"},{"type":"ul","items":["PVM tarifas eilutės, o ne sąskaitos lygyje. Kiekviena paslauga turi turėti savo tarifą, o suma be PVM ir PVM suma — būti sudėtos iš eilučių.","Tarifas, pririštas prie rezervacijos datos. Sistema turi prisiminti, koks tarifas galiojo rezervacijos sudarymo metu, o ne imti dabartinį iš nustatymų.","Nuosekli numeracija be spragų. Tai ne naujiena, bet keičiantis tarifams ir perrašinėjant sąskaitas ranka spragos atsiranda būtent tada."]},{"type":"h2","text":"Ir dar viena smulkmena apie kainodarą"},{"type":"p","text":"Tarifui pakilus nuo 9 iki 12 procentų, jūs turite pasirinkimą: pakelti galutinę kainą svečiui arba prisiimti skirtumą į savo maržą. Tai verslo sprendimas, ne mokestinis."},{"type":"p","text":"Bet techniškai tai reiškia, kad turite žinoti, ar jūsų kainos sistemoje suvestos su PVM, ar be PVM. Jei su PVM ir nieko nekeitėte — jūsų marža nuo sausio 1 d. sumažėjo, ir galbūt to nepastebėjote."},{"type":"h2","text":"Kur čia Revoo"},{"type":"p","text":"Revoo yra apgyvendinimo valdymo sistema kartu su rezervacijų svetaine — viešbučiams, nameliams, svečių namams ir apartamentams. Sąskaitos pritaikomos konkrečios šalies taisyklėms kaip diegimo dalis, o ne kaip varnelė nustatymuose."},{"type":"p","text":"Nedirbame kaip lentynos produktas su savitarnos registracija: vienu metu diegiame keliems objektams ir sistemą pritaikome tam, kaip objektas realiai dirba. Jei norite pasitikrinti, ar tai tinka jūsų objektui, kitas žingsnis — 45 minučių pokalbis."}]'::jsonb, 'published', '2026-08-20'::date, '2026-08-20'::timestamptz);