CREATE TYPE public.template_kind AS ENUM ('email', 'call');

CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.template_kind NOT NULL,
  name text NOT NULL,
  subject text,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX message_templates_kind_idx
  ON public.message_templates (kind, is_active, name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage templates" ON public.message_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER message_templates_set_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.client_activities
  ADD COLUMN IF NOT EXISTS template_id uuid
  REFERENCES public.message_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS client_activities_template_idx
  ON public.client_activities (template_id);

CREATE OR REPLACE VIEW public.message_template_stats
WITH (security_invoker = true) AS
SELECT
  t.id            AS template_id,
  count(a.id)     AS usage_count,
  max(a.occurred_at) AS last_used_at
FROM public.message_templates t
LEFT JOIN public.client_activities a ON a.template_id = t.id
GROUP BY t.id;

GRANT SELECT ON public.message_template_stats TO authenticated;

INSERT INTO public.message_templates (kind, name, subject, body) VALUES
('call', 'Pirmas skambutis — veikiantis objektas', NULL, $tpl$ATIDARYMAS
Laba diena, {{vardas}}. Skambinu dėl {{objektas}} — ar jūs valdote šį objektą?

KODĖL SKAMBINU
Dirbame su apgyvendinimo objektais, kurie priima rezervacijas patys, ne tik per
Booking.com. Klausimas vienas: kiek jūsų rezervacijų šiandien ateina tiesiogiai?

KLAUSIMAI
- Kaip šiandien valdote rezervacijas — kalendorius, Excel, ar sistema?
- Ar siūlote svečiams ką nors be nakvynės? Pusryčius, pirtį, salę?
- Kas išrašo sąskaitas ir kiek tai užima laiko?
- Kaip kambarinės sužino, ką tvarkyti ryte?
- Ar turite verslo klientų, kuriems reikia sąskaitos įmonei?

JEI SAKO „TURIME SISTEMĄ"
Kokią? Ir kas joje labiausiai erzina?

JEI SAKO „NETURIU LAIKO"
Suprantu. Ar galiu atsiųsti vieną laišką, o jūs pažiūrėsite, kai bus ramiau?

PABAIGA
Siūlau 45 minutes ekrane — parodysiu su jūsų kambarių struktūra, ne su
demonstraciniais duomenimis. Tinka antradienį 10:00 ar ketvirtadienį 14:00?$tpl$),
('email', 'Po skambučio — bendras', 'Revoo — {{objektas}}', $tpl$Laba diena, {{vardas}},

Ačiū už pokalbį. Supratau taip: [vienas sakinys jo žodžiais].

Trys dalykai, kurie būtent tam skirti:

— Papildomos paslaugos prisegamos prie rezervacijos ir sąskaitoje eina
atskiromis eilutėmis.
— Sąskaitos su jūsų rekvizitais, nuoseklia numeracija ir PVM pagal Lietuvos
tvarką — paruoštos tada, kai svečias išvyksta.
— Rezervacijų svetainė jūsų domenu ir jūsų dizainu, ne įskiepis svetimoje
svetainėje.

Kaip visa tai atrodo: revoo.site

Siūlau 45 minučių pokalbį ekrane — parodysiu su jūsų kambarių struktūra.
Tinka antradienį 10:00 ar ketvirtadienį 14:00?

{{mano_vardas}}
revoo.site$tpl$),
('email', 'Priminimas po 4 dienų', 'Revoo — {{objektas}}', $tpl${{vardas}},

ar ateinančią savaitę būtų patogiau?

{{mano_vardas}}$tpl$),
('call', 'SPIN — pasekmių klausimai', NULL, $tpl$Kam: kai pokalbis jau prasidėjo ir žmogus kalba. Tikslas — kad jis pats
pasakytų skaičių, ne kad tu jį pasakytum.

1. SITUACIJA — trumpai, ne daugiau trijų klausimų
- Kiek vienetų {{objektas}} turite?
- Kiek žmonių dirba sezono metu?
- Kaip šiandien valdote rezervacijas?

2. PROBLEMA — kur skauda
- Ar pasitaiko, kad ta pati data užsirašo du kartus?
- Kaip sužinote, kad kambarys dar nesutvarkytas?
- Kas išrašo sąskaitas ir kada?

3. PASEKMĖS — čia yra visas pokalbio svoris
- Kai liepą susikerta dvi rezervacijos — ką tada darote?
- Kiek kartų taip nutiko per praėjusį sezoną?
- Jei išvažiuojate savaitei, kas priima rezervacijas?
- Kai svečias po mėnesio paprašo sąskaitos įmonei — kiek laiko užtrunka
  surasti jo duomenis?
- Kiek maždaug nakvynių per mėnesį ateina per Booking.com?
  (Tada garsiai suskaičiuokite komisinius per metus ir patylėkite.)

4. NAUDA — leisk jam pačiam pasakyti vertę
- Jei dviguba rezervacija būtų techniškai neįmanoma, ką tai jums duotų?
- Jei sąskaita būtų paruošta tą pačią minutę, kai svečias išvyksta, kiek
  laiko per savaitę atgautumėte?
- Jei kas dešimta Booking rezervacija taptų tiesioginė — kiek tai per sezoną?

PABAIGA
Tai, ką ką tik išvardinote, ir yra tie trys dalykai, kuriuos sistema daro.
Siūlau 45 minutes ekrane su jūsų kambarių struktūra. Tinka antradienį 10:00
ar ketvirtadienį 14:00?$tpl$),
('email', 'Šaltas kontaktas — PAS', '{{objektas}} ir Booking komisiniai', $tpl$Laba diena, {{vardas}},

Dauguma {{miestas}} apgyvendinimo objektų rezervacijas priima per Booking.com,
o kalendorių veda atskirai — lentelėje arba popieriuje.

Prie 15–18 % komisinių tai reiškia, kad iš kiekvienos šimto eurų nakvynės
maždaug septyniolika lieka ne jums. Per sezoną susidaro suma, už kurią
galima būtų atnaujinti kelis kambarius. O dvigubos rezervacijos pastebimos
tada, kai svečias jau stovi prie durų.

Revoo yra sistema, kurioje rezervacijos, kambarinių darbai ir sąskaitos
gyvena vienoje vietoje, o rezervacijų svetainė veikia jūsų domenu — be
tarpininko ir be komisinių.

Kaip tai atrodo: revoo.site

Jei įdomu, atsakykite vienu žodžiu ir pasiūlysiu laiką trumpam pokalbiui.

{{mano_vardas}}
revoo.site$tpl$),
('email', 'Devynių žodžių atgaivinimas (be parašo, be nuorodos)', '{{objektas}}', $tpl${{vardas}},

ar vis dar ieškote rezervacijų sistemos {{objektas}}?

Šis šablonas veikia tik tada, jei siunčiamas be parašo, be nuorodos ir be jokio konteksto. Skirtas kontaktams, kurie nutilo po trijų prisilietimų. Nieko nepridėk.$tpl$),
('call', 'SPIN — apartamentai ir svečių namai (savininkas viską daro pats)', NULL, $tpl$SITUACIJA
- Kiek vienetų šiuo metu nuomojate?
- Rezervacijas priimate pats ar kas nors padeda?
- Kaip vedate kalendorių — telefone, lentelėje, ar sistemoje?

PROBLEMA
- Ar būna, kad skambina rezervuoti, o jūs tuo metu ne prie kompiuterio?
- Kaip valytoja sužino, kurį vienetą tvarkyti šiandien?
- Ar pasitaikė, kad ta pati data buvo užimta du kartus?

PASEKMĖS — čia visas svoris
- Kiek kartų per savaitę atsakote į tuos pačius klausimus žinutėmis?
- Kai išvažiuojate savaitgaliui, kas priima rezervacijas? O jei savaitei?
- Kai svečias atvažiuoja vėlai — kaip jis patenka į vidų?
- Kiek nakvynių per mėnesį ateina per Booking.com?
  (Suskaičiuok komisinius per metus garsiai ir patylėk.)

NAUDA — tegul pasako jis
- Jei rezervacija užsirašytų pati, o jums liktų tik patvirtinti — kiek laiko
  per savaitę atgautumėte?
- Jei durų kodas išsiųstų automatiškai po apmokėjimo, ką tai pakeistų?
- Jei kas dešimta Booking nakvynė taptų tiesioginė — kiek tai per sezoną?

DAŽNIAUSIAS PRIEŠTARAVIMAS: „man tiek nereikia, aš susitvarkau"
Suprantu. Klausimas ne dėl šiandien, o dėl to, kas bus, kai vienetų bus dvigubai.
Ar planuojate plėstis?

PABAIGA
Siūlau 45 minutes ekrane su jūsų realiais vienetais. Tinka antradienį 10:00
ar ketvirtadienį 14:00?$tpl$),
('call', 'SPIN — viešbutis su registratūra', NULL, $tpl$SITUACIJA
- Kiek numerių? Ar registratūra dirba visą parą?
- Kokią sistemą naudojate rezervacijoms?
- Ar be nakvynės parduodate ką nors dar — pusryčius, SPA, sales?

PROBLEMA
- Kaip informacija perduodama tarp pamainų?
- Kaip kambarinės gauna dienos sąrašą — spausdinate ar telefone?
- Ar papildomos paslaugos patenka į tą pačią sąskaitą, ar išrašomos atskirai?

PASEKMĖS
- Kas nutinka, kai per pamainų perdavimą kažkas lieka nepasakyta?
- Kiek kartų per mėnesį svečias skundžiasi dėl to, kas buvo pamiršta?
- Kai įmonė paprašo sąskaitos už seminarą su nakvyne, maitinimu ir sale —
  kiek dokumentų tenka sudėti į vieną?
- Nuo 2026 m. nakvynei taikomas 12 % PVM, o saunai ir sporto salei —
  standartinis. Kaip šiandien tai atrodo jūsų sąskaitoje?

NAUDA
- Jei kambarinės sąrašas susidėliotų pats pagal šiandienos išvykimus, ką tai
  duotų rytinei pamainai?
- Jei visos paslaugos eitų viena sąskaita su teisingais tarifais — kiek
  buhalterijos laiko atkristų?

DAŽNIAUSIAS PRIEŠTARAVIMAS: „turime sistemą"
Kokią? Ir kas joje labiausiai erzina kasdien? Nesiūlau keisti dėl keitimo —
klausiu, ar yra vieta, kur ji jums trukdo.

PABAIGA
45 minutės ekrane su jūsų numerių struktūra ir jūsų paslaugomis.
Tinka antradienį 10:00 ar ketvirtadienį 14:00?$tpl$),
('call', 'SPIN — didelis viešbutis (yra vadovas, buhalterė, pamainos)', NULL, $tpl$SITUACIJA
- Kiek numerių ir kiek žmonių dirba priešakinėje linijoje?
- Kokia sistema šiandien? Kiek metų ja naudojatės?
- Kokia dalis rezervacijų ateina per OTA?

PROBLEMA
- Kas jums toje sistemoje kainuoja daugiausia laiko?
- Kaip greitai gaunate atsakymą iš dabartinio tiekėjo, kai kažkas neveikia?
- Ar sistema kalba lietuviškai ir ar sąskaitos atitinka LT reikalavimus?

PASEKMĖS
- Kiek mokate už licenciją per metus? Ar kaina auga su kambarių skaičiumi?
- Kai reikia pakeitimo, kuris tinka būtent jums — per kiek laiko jį gaunate?
- Ką daro buhalterija, kai sistemos sąskaita neatitinka LT tvarkos?

NAUDA
- Jei tiekėjas būtų Lietuvoje ir pakeitimą padarytų per savaitę, o ne per metus —
  ką tai pakeistų jūsų kasdienybėje?

PRIVALOMA PASAKYTI PIRMOJE MINUTĖJE, JEI PAKLAUS APIE OTA
Šiandien darome užimtumo importą per iCal — jų rezervacijos matomos jūsų
kalendoriuje. Pilną dvipusį sinchronizavimą įgyvendiname diegimo metu pagal
jūsų naudojamus kanalus. Sakau iš karto, kad nebūtų netikėtumo demonstracijoje.

PABAIGA
Siūlau pirmą pokalbį su jumis ir tuo žmogumi, kuris sistemą naudos kasdien —
be jo sprendimas vis tiek neįvyks. Kada jums abiem tiktų?$tpl$),
('call', 'SPIN — poilsio nameliai ir kempingai', NULL, $tpl$SITUACIJA
- Kiek namelių? Ar dirbate ištisus metus, ar sezoniškai?
- Kaip svečias patenka į namelį atvykęs vėlai?

PROBLEMA
- Kaip sekate, kuris namelis jau paruoštas, o kuris ne?
- Ar būna dienų, kai vieni svečiai išvyksta ir tą pačią dieną atvyksta kiti?
- Kas nutinka, kai orai pasikeičia ir žmonės pradeda atšaukinėti?

PASEKMĖS
- Kiek kartų per sezoną nutiko, kad namelis nebuvo paruoštas laiku?
- Sezonas trumpas — kiek kainuoja viena tuščia naktis liepą?
- Kiek laiko per dieną praleidžiate rašydami kodus ir nurodymus žinutėmis?

NAUDA
- Jei sistema pati parodytų, kuriuos namelius reikia paruošti šiandien ir kokia
  tvarka — kiek rytinio laiko atgautumėte?
- Jei kodas išeitų automatiškai tik patvirtinus apmokėjimą?

PABAIGA
45 minutės ekrane su jūsų namelių struktūra ir sezono kainomis.
Tinka antradienį 10:00 ar ketvirtadienį 14:00?$tpl$),
('call', 'SPIN — apartamentai keliais adresais', NULL, $tpl$SITUACIJA
- Kiek apartamentų ir keliuose skirtinguose pastatuose ar adresuose?
- Registratūros nėra — kaip svečiai patenka į vidų?

PROBLEMA
- Kaip valytojos sužino dienos maršrutą tarp adresų?
- Ar visi apartamentai vienoje vietoje matomi kaip vienas kalendorius?
- Kaip atrodo raktų arba kodų logistika?

PASEKMĖS
- Kiek laiko per dieną sugaištama važinėjant ne ta tvarka?
- Kai norite pridėti dar vieną apartamentą, kiek naujo darbo tai sukuria?
- Ties kiek apartamentų dabartinė tvarka nustos veikti?

NAUDA
- Jei visi adresai būtų viename kalendoriuje, o valymo užduotys susidėliotų
  pagal išvykimus — kiek apartamentų galėtumėte valdyti tais pačiais žmonėmis?

PABAIGA
Parodysiu, kaip atrodo vienas kalendorius keliems adresams.
Tinka antradienį 10:00 ar ketvirtadienį 14:00?$tpl$),
('call', 'SPIN — naujas arba dar statomas objektas', NULL, $tpl$SITUACIJA
- Kada planuojate atidaryti?
- Kiek vienetų numatyta? Kas be nakvynės — restoranas, SPA, salės?
- Ar jau apsisprendėte, kokią sistemą naudosite?

PROBLEMA
- Kaip planuojate priimti pirmąsias rezervacijas — per Booking.com ar per savo
  svetainę?
- Kas tvarkys kambarinių grafikus atidarymo savaitę?
- Ar sąskaitų tvarka jau aptarta su buhalterija?

PASEKMĖS
- Jei atidarote turėdami tik Booking.com, nuo pirmos dienos mokate komisinius už
  kiekvieną nakvynę. Per pirmą sezoną tai susideda į sumą, kurią lengviau
  įsivaizduoti nei atgauti.
- Sistemą keisti po atidarymo yra brangiau nei ją pasirinkti prieš — nes tada
  jau reikia perkelti rezervacijas ir permokyti žmones.

NAUDA
- Jei atidarymo dieną svetainė jau priimtų tiesiogines rezervacijas, kokią dalį
  pirmo sezono nakvynių norėtumėte matyti be tarpininko?

TERMINAS — pasakyk konkrečiai
Diegimas trunka apie [X] savaičių, todėl pradėti verta likus maždaug dviem
mėnesiams iki atidarymo. Jei atidarote pavasarį, ramiausias laikas pradėti —
sausis.

PABAIGA
Siūlau pokalbį dabar, o sprendimą priimsite vėliau — kad tiesiog žinotumėte,
kiek laiko tam reikia. Tinka antradienį 10:00 ar ketvirtadienį 14:00?$tpl$),
('call', 'Prieštaravimų atsakymai', NULL, $tpl$„BRANGU"
Kiek per metus sumokate Booking.com komisinių? … Palyginkime būtent su tuo,
o ne su nuliu.

„TURIME SISTEMĄ"
Kokią? Ir kas joje labiausiai erzina kasdien? Jei niekas — puiku, tada tikrai
nereikia keisti.

„NETURIU LAIKO"
Suprantu. Ar galiu atsiųsti vieną laišką, o jūs pažiūrėsite, kai bus ramiau?

„PAGALVOSIU"
Žinoma. Kad būtų apie ką galvoti — ko jums trūksta, kad galėtumėte apsispręsti?

„AR SINCHRONIZUOJATE SU BOOKING.COM?"
Šiandien darome užimtumo importą per iCal — jų rezervacijos matomos jūsų
kalendoriuje. Pilną dvipusį sinchronizavimą įgyvendiname diegimo metu pagal
jūsų kanalus.

„AR PRIIMATE MOKĖJIMUS?"
Prijungiame tą mokėjimų tiekėją, kurį jūs naudojate. Tai diegimo darbas, ne
dėžutėje esanti funkcija.

„MES PER MAŽI / PER DIDELI"
Sistema neturi vienetų ribos. Skiriasi ne sistema, o tai, ką jums sukonfigūruojame.

„ATSIŲSKITE PASIŪLYMĄ"
Atsiųsiu, bet kaina priklauso nuo to, ko jums reikia. Duokite 20 minučių, kad
pasiūlymas būtų apie jus, o ne bendras.$tpl$);