# Kontaktų rinkimas 10/10: greitai, daug ir pigiai

## Kodėl dabar renka mažai
- Įmonės dabar ieškomos tik nemokamame žemėlapyje. Ten yra maža dalis įmonių su svetainėmis: Miami užduotyje rado tik 11.
- Paskutinėje užduotyje miestas „Miami“ neišsaugotas, todėl ieškota visoje JAV.
- Per minutę apdorojamos tik kelios svetainės, todėl rinkimas lėtas.

## Kaip tikriausiai veikia kolegos sprendimas
Dirbtinis intelektas sudaro šimtus įmonių ir jų svetainių sąrašą pagal miestą ir veiklą. Sistema tas svetaines aplanko pati, nemokamai, ir išrenka el. paštus. Dirbtinio intelekto užklausa už šimtus įmonių kainuoja centus, todėl „~1 kreditas už 200–300 kontaktų“ yra realu. Neturėdami jo projekto, šito patvirtinti negalime – tai tik spėjimas.

## Ką padarysiu
1. **Naujas pagrindinis šaltinis – dirbtinis intelektas.** Pagal šalį, miestą ir veiklą jis pateiks 50 įmonių su svetainėmis. Kai sąrašas baigsis, prašys kitų 50, kurių dar neturime, kol bus pasiektas tikslas. Didelius miestus sistema pati suskirstys į rajonus, pvz., Miami Beach, Brickell, Coral Gables.
2. **Tikrinimas.** Kiekviena siūloma svetainė bus aplankyta. Neveikiančios ir išgalvotos bus atmestos, todėl registre liks tik tikri, svetainėse rasti el. paštai.
3. **10 kartų greičiau.** Vienu metu bus tikrinama daug svetainių. Tikslas – 200–300 kontaktų per maždaug 20 minučių.
4. **Lentelėje bus** įmonės pavadinimas, svetainė, šalis, miestas, veikla, el. paštas, telefonas ir šaltinis.
5. **Miestas visada išsaugomas.** Santraukoje bus parodyta „Ieškoma: Miami, JAV“.
6. **Žemėlapis lieka papildomas šaltinis.** Mokama paieška nebus prijungta.
7. **Atmesiu didžiąsias platformas** (Booking, Airbnb, Tripadvisor ir pan.).
8. **Galėsite tęsti užduotį**, jei tikslas nepasiektas.
9. **Išbandysiu Miami su tikslu 100** ir pranešiu realų greitį ir kainą.

## Kaina
Dirbtinio intelekto užklausos apmokamos iš darbo erdvės kreditų. 100–300 kontaktų turėtų kainuoti mažiau nei 1 kreditą; tikrą kainą pamatysiu po bandymo.

## Techninės detalės
- `scrape.server.ts`: naujas AI discovery etapas per Lovable AI Gateway (`google/gemini-2.5-flash`, struktūrizuotas JSON: name, website, city, district). Paduodami jau turimi domenai, kad AI nesiūlytų jų pakartotinai. Rajonų sąrašą sugeneruoja AI.
- Domenai normalizuojami; neleidžiamų domenų sąrašas; tolesnis apdorojimas per esamą `scrape_sites` eilę ir `insert` iki tikslo.
- Tick: lygiagretus apdorojimas (pvz., 15–20 svetainių po 8 s timeout), kelios partijos per minutę, kol neviršijamas laiko biudžetas.
- `scrape_sites`/`scrape_contacts` papildyti company_name, city, category, source, jei jų trūksta; atnaujinti UI lentelę ir CSV.
- Patikrinti, kaip miestas keliauja iš formos į `scrape_jobs.city`; veiksmas „tęsti“, kai užduotis `exhausted`.
- Testai `scrape-extract.test.ts` papildyti domenų filtravimu.
