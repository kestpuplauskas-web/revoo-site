# Tekstų atnaujinimas pagal Revoo_site_text.docx

Atnaujinami tik tekstų failai: `src/content/copy.en.ts` ir `src/content/copy.lt.ts`.
Kiekviena kalba redaguojama nepriklausomai — LT keitimai neverčiami į EN ir atvirkščiai.
Dizainas, komponentai ir logika nekeičiami.

## EN pakeitimai (tik tai, kas dokumente pažymėta „EN keičiame“)

- Herojaus antraštė: „Software that adapts to your business — not the other way around.“
- Herojaus paantraštė: „Hotels, cabins, guesthouses and apartments each run differently — yet most software expects them to work the same way. Revoo is a platform we shape around your operation, with a booking website that is genuinely yours.“
- Karuselės 2 skaidrė: „Manage housekeeping tasks and keep team in sync with one smart app.“
- Sekcijos etiketė „The week“ → „Booking management“.
- Iš rezervacijų sekcijos punktų išmetamas punktas apie „Same-day turnovers are allowed on purpose…“.
- Sekcijos etiketė „The morning“ → „Housekeeping“.
- Kambarių priežiūros 1 punktas: „Same-day turnovers come first — they have the tightest time window.“
- „This is not for you if“ sąraše: „Chains and groups above roughly 50 units“ → „You’re a larger hotel group.“
- Paleidimo (Launch) žingsnio tekstas: „Your existing bookings move across. We train your reception and housekeeping teams, so everyone knows how to use the system from day one.“
- Formos smulkus tekstas: „We reply within one working day. No automated emails — we reply personally.“
- DUK klausimas: „What happens if I outgrow you?“ → „What happens if I decide to move to another solution?“ (atsakymas EN nekeičiamas — dokumente nurodyta keisti tik klausimą).

Visa kita EN dalis paliekama kaip yra.

## LT pakeitimai

- Meniu ir poraštės nuorodos: Požiūris → Mūsų požiūris, Kam skirta → Kas renkasi Revoo, Blogas → Naujienos.
- Herojus: nauja etiketė, antraštė, paantraštė ir „Parašykite mums…“ eilutė.
- Karuselės skaidrių tekstai (4 nauji lietuviški tekstai).
- „Mūsų požiūris“ sekcija: nauja antraštė, įvadas ir abi kortelės („Esame šalia nuo pirmos dienos“, „Tai daugiau nei mėnesinė prenumerata“).
- Rezervacijų valdymo sekcija: nauja etiketė („Rezervacijų valdymas“), antraštė, įvadas ir 3 punktai (išmetamas punktas apie tos pačios dienos apyvartą).
- Kambarių priežiūros sekcija: nauja etiketė („Kambarių priežiūros valdymas“), antraštė, įvadas ir 5 nauji punktai.
- Sąskaitų sekcija: nauja etiketė, antraštė, įvadas ir 4 punktai.
- Rezervacijų kanalo sekcija: nauja antraštė, įvadas ir pastaba po nuotrauka apie REST API.
- Objektų tipų karuselė: antraštė „Sukurta pagal tai, kaip dirbate Jūs.“ ir 4 nauji tekstai (viešbučiams, nameliams, svečių namams, apartamentams).
- CTA juosta: „Įdomu, ar „Revoo“ tiktų jūsų apgyvendinimo vietai? …“
- „Ką gaunate“ sekcija: nauja antraštė, įvadas, abiejų stulpelių pavadinimai ir visi punktai (10 + 8).
- „Kas renkasi Revoo“ sekcija: nauja etiketė, antraštė, įvadas, 7 „tinka“ ir 4 „netinka“ punktai.
- „Nuo ko pradedame“ sekcija: nauja etiketė, antraštė, įvadas ir 3 žingsniai.
- „Susisiekime“ sekcija: nauja antraštė, įvadas, kontaktų faktai ir formos smulkus tekstas.
- DUK: nauja etiketė, antraštė ir visi 7 klausimai su atsakymais (įskaitant „Kas nutiks, jei nuspręsiu pereiti prie kito sprendimo?“).
- Poraštė: atnaujintas aprašymas.

## Techninės detalės

- `copy.types.ts` struktūra nekeičiama, išskyrus tai, kad `week.points` sąrašas trumpėja nuo 4 iki 3 elementų — tipas naudoja masyvą, todėl schemos keisti nereikia.
- Antraštėse naudojama `*žodis*` sintaksė paryškinimui — ji išlaikoma naujuose tekstuose.
- Po pakeitimų paleidžiamas tipų tikrinimas ir peržiūroje patikrinami abu puslapiai (`/` ir `/lt`).

## Ko šis planas neapima

- Dokumente minimi „gif“ vaizdai — keičiami tik jų tekstai, patys vaizdai nekeičiami.
- SEO meta tekstai (`homeSeo`) nekeičiami, nes dokumente jų nėra. Jei norite, kad LT meta tekstas atitiktų naują antraštę, pasakykite.
