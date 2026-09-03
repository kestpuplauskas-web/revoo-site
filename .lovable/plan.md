# Klientų registras — pardavimų piltuvėlis admin dalyje

Nauja meniu skiltis „Klientų registras“ šalia „Valdomi projektai“. Ta pati `clients` lentelė, tie patys klientai — bet registras rodo visą piltuvėlį (ir tuos, su kuriais dar tik bandome susisiekti), su veiksmų istorija, kito veiksmo sekimu ir CSV importu.

## 1. Būsenos

Prie esamo būsenų sąrašo pridedamos naujos reikšmės. Nė viena esama nešalinama ir nepervadinama, todėl realūs klientai su sutartimis, projektais ir mokėjimais lieka nepaliesti.

Pardavimo eiga sąsajoje:

```text
Naujas (lead) → Susisiekta → Laukiama atsakymo → Gautas atsakymas →
Demo suderinta → Pasiūlymas išsiųstas → Derybos (negotiation) →
Laimėta / Prarasta
```

Po laimėjimo klientas natūraliai pereina į esamas būsenas: Diegimas, Aktyvus, Pristabdytas, Nutrauktas. Duomenų bazėje reikšmės angliškos, lietuviški pavadinimai — tik viename sąsajos žodyne (`src/lib/admin-format.ts`).

## 2. Kliento kortelės laukai

Jau yra: pavadinimas, įmonė, miestas, šalis, tipas, kambarių skaičius, kontaktinis asmuo, el. paštas, telefonas, pastaba, būsena.

Pridedama: pastato plotas, statytojas/vystytojas, svetainė, kito veiksmo aprašymas, kito veiksmo data, atsakingas mūsų komandos žmogus, sukūrimo autorius.

Kontaktinis asmuo (dirba objekte) ir atsakingas žmogus (dirba pas mus) — atskiri laukai.

## 3. Veiksmų istorija

Viena chronologinė juosta kortelėje, naujausia viršuje, su data, laiku ir autoriaus vardu. Filtrai: viskas / tik veiksmai / tik pakeitimai.

**Rankiniai įrašai** (skambutis, laiškas, susitikimas, demo, pasiūlymas, pastaba, užduotis) — galima įvesti su praėjusia data; juostoje rikiuojami pagal įvykio, ne įrašymo laiką. Autorių galima taisyti tik savo įrašus.

**Automatiniai įrašai** rašomi pačios duomenų bazės, kai keičiasi prasmingas laukas: būsena, atsakingas, kontaktai, kambarių skaičius, kito veiksmo data, pavadinimas, svetainė, statytojas. Techniniai laukai (atnaujinimo laikas, atnaujintojas) neįrašomi. Matoma sena ir nauja reikšmė. Šių įrašų negali redaguoti ar trinti niekas, įskaitant administratorių.

Rodoma žmogaus kalba: „Kęstutis priskyrė objektą Rasai“, „Būsena: Susisiekta → Demo suderinta“. Vartotojų identifikatoriai keičiami vardais, laukų pavadinimai — lietuviškais, būsenos — tomis pačiomis etiketėmis kaip kortelėje.

Vardams reikia mažos `profiles` lentelės (vardas + el. paštas), pildomos prisijungus; be jos juostoje matytųsi identifikatoriai.

## 4. Sąrašas ir filtrai

Filtrų juosta: būsena, atsakingas, kambarių rėžis (iki 20 / 20–50 / virš 50), kito veiksmo būklė (vėluoja / šiandien / būsimi) ir laisva paieška per pavadinimą, el. paštą, statytoją ir pastabą. Filtrai veikia kartu.

Pradelsti objektai žymimi ryškiai ir keliami į sąrašo viršų.

Virš sąrašo — suvestinė: kiek objektų kiekvienoje būsenoje, kiek pradelstų, kiek be atsakingo.

Renkamės sąrašą, ne Kanban — praktiškiau su penkiais filtrais ir telefone.

## 5. CSV importas

Įkeliamas failas, tada rodoma stulpelių priskyrimo lentelė — pats pasirenki, kuris CSV stulpelis atitinka kurį lauką (veikia su bet kokiu failu).

Valymas: „nežinoma“, „-“, „n/a“ → laukas lieka tuščias; „~50“, „50 kamb.“ → įrašoma 50; netaisyklingas el. paštas ignoruojamas, eilutė nenulūžta.

Dublikatų atpažinimas pakopomis: svetainės domenas → el. paštas → pavadinimas + miestas. Radus sutapimą eilutė praleidžiama ir parodoma ataskaitoje („sukurta X, praleista Y, klaidų Z“). Antras to paties failo importas nesukuria nė vieno naujo objekto.

## 6. Ko neliečiame

Esama `clients` lentelė nekuriama iš naujo; projektų, mokėjimų, laiko įrašų ir tikietų laukai nekeičiami. Prisijungimas ir rolės patikra — esami. Vieša svetainė, blogas, sitemap, robots — nepaliesti. Admin sąsaja lietuviška.

## Techninė dalis

**Migracijos (atskiromis pakopomis — PostgreSQL neleidžia naudoti naujos enum reikšmės toje pačioje transakcijoje):**

1. `ALTER TYPE client_status ADD VALUE` naujoms reikšmėms: `contacted`, `awaiting_reply`, `replied`, `demo_scheduled`, `proposal_sent`, `won`, `lost`. Atskira migracija, nieko daugiau.
2. `public.profiles` (`id` → auth.users, `full_name`, `email`) + GRANT + RLS (visi autentifikuoti gali skaityti vardus, redaguoti tik savo).
3. `clients` naujos kolonos: `building_area_sqm numeric`, `developer text`, `website_url text`, `next_action text`, `next_action_date date`, `assigned_to uuid`, `created_by uuid`, `updated_by uuid`.
4. `public.client_activities`: `client_id`, `kind` (`manual` / `system`), `activity_type` enum (call, email, meeting, demo, proposal, note, task), `occurred_at timestamptz`, `body text`, `field text`, `old_value text`, `new_value text`, `author_id`, `created_at`. GRANT + RLS: admin skaito visus; INSERT/UPDATE/DELETE leidžiama tik `kind = 'manual'` ir tik savo įrašams — sisteminių eilučių negali keisti niekas.
5. Trigeris `clients_log_changes` (AFTER INSERT/UPDATE, SECURITY DEFINER, `search_path = public`): sukūrus rašo „objektas sukurtas“, atnaujinus lygina tik sekamų laukų sąrašą ir kiekvienam pakeitimui rašo atskirą eilutę su `auth.uid()` kaip autoriumi. Nepakitus nieko — nė vieno įrašo. Tas pats trigeris nustato `updated_by`.

**Kodas:**

- `src/lib/registry.functions.ts` — `listRegistry` (su suvestine), `getRegistryClient`, `saveRegistryClient`, `addActivity`, `listTeam`, `importClientsCsv`; visos per `requireSupabaseAuth`.
- `src/lib/admin-format.ts` — papildomas būsenų žodynas ir laukų pavadinimų vertimai istorijai (vienas žodynas, be dublikatų).
- `src/routes/_authenticated/admin.registras.index.tsx` — sąrašas, filtrai, suvestinė.
- `src/routes/_authenticated/admin.registras.$id.tsx` — kortelė su laukais ir veiksmų juosta.
- `src/routes/_authenticated/admin.registras.importas.tsx` — CSV su stulpelių priskyrimu.
- `src/routes/_authenticated/admin.tsx` — nauja nuoroda meniu.
- Profilio vardas užpildomas prisijungus (upsert per serverio funkciją), be jokių trigerių `auth` schemoje.

**Patikros po įgyvendinimo:** objekto sukūrimas, dvigubas pakeitimas vienu išsaugojimu, tuščias išsaugojimas, vakarykštės datos skambutis, priskyrimas kolegai, pradelsimo kėlimas į viršų, sudėtinis filtravimas, CSV su „nežinoma“ / „~50“, pakartotinis to paties failo importas, „Valdomi projektai“ nepakitę, neprisijungusio nukreipimas į prisijungimą.
