# Kontaktų rinkimas (B2B el. pašto scraperis) admin skydelyje

## Ką gausite
Nauja admin skiltis **„Kontaktų rinkimas“** (grupėje „Valdymas“). Nustatote tikslą (pvz. 500), šalį, veiklos sritį, nebūtinai miestą, frazes ar savo URL sąrašą, spaudžiate „Pradėti rinkimą“. Sistema dirba fone, net uždarius naršyklę, kol surenka tiek unikalių kontaktų arba aiškiai praneša, kad šaltiniai išseko.

## Kaip veiks
1. **Įmonių paieška (nemokamai):** OpenStreetMap duomenys. Pagal šalį ar miestą ir kategoriją (viešbučiai, apartamentai, svečių namai, kempingai, automobilių nuoma, restoranai) gaunamos įmonės su svetainėmis, o kartais ir su el. paštu. Taip pat galima įkelti savo URL sąrašą.
2. **Papildomas šaltinis (pasirinktinai):** paieška internete per Firecrawl pagal jūsų frazes, kai OpenStreetMap šaltinis išsenka. Jis kainuoja kreditus, todėl jungiamas tik jums sutikus.
3. **Svetainių skenavimas:** pagrindinis puslapis ir prioritetiniai puslapiai (kontaktai, apie mus, rezervacijos). Iš jų imami `mailto:` ir tekste esantys adresai, išsaugomas šaltinio URL. Laikomasi robots.txt taisyklių, CAPTCHA ir prisijungimai neapeinami, vidiniai adresai blokuojami.
4. **Kokybė:** tikrinama adreso sintaksė ir domeno MX įrašas, priskiriamas kontakto tipas (info@, reservations@, sales@ ir kt.) ir patikimumo lygis. Testiniai laiškai nesiunčiami, AI nenaudojamas.
5. **Dublikatai:** tas pats el. paštas, nepriklausomai nuo didžiųjų ir mažųjų raidžių, saugomas tik vieną kartą per visas užduotis. Klientų registre jau esantys adresai irgi laikomi dublikatais.
6. **Tikslas:** naujų kontaktų skaičius didinamas atomiškai, todėl tikslas niekada neviršijamas. Pasiekus tikslą, nauji darbai nebepradedami.
7. **Valdymas:** Pradėti, Pristabdyti, Tęsti, Sustabdyti, Pakartoti nepavykusias. Prieš paleidimą rodoma užduoties santrauka.
8. **Gyva statistika:** tikslas ir surinkta, progresas %, atrastos, nuskaitytos, eilėje ir nepavykusios svetainės, nauji kontaktai, dublikatai, atmesti, greitis per valandą, paskutinis veiksmas ir klaidų žurnalas.
9. **Rezultatai:** kontaktų lentelė su filtrais. Mygtukas **„Perkelti į Klientų registrą“** juos įrašo su statusu „Naujas“, šalimi ir įmone, kad iškart galėtumėte kurti kampaniją.

## Svarbu žinoti
- Islandijoje ir Lietuvoje OpenStreetMap turi ribotą kiekį apgyvendinimo įstaigų su svetainėmis: tikėtina keli šimtai, o ne tūkstančiai vienoje šalyje. Didesniems tikslams reikės Firecrawl paieškos.
- Kai kurios svetainės el. pašto neskelbia arba blokuoja automatinį skaitymą. Tokios svetainės tiesiog praleidžiamos.
- Šaltiems laiškams ES taikomas GDPR. Atsisakymo nuoroda kampanijose jau yra.

## Techninė dalis
- Lentelės: `scrape_jobs` (nustatymai, būsena, skaitikliai), `scrape_sites` (eilė, unikali pagal domeną, būsena, bandymai, `next_attempt_at`, `locked_until`), `scrape_contacts` (unikalus `lower(email)`, šaltiniai, MX, tipas), `scrape_job_logs`. Visos lentelės su GRANT ir RLS, prieiga tik admin.
- Vykdymas: maršrutas `/api/public/hooks/scrape-tick`, kurį kas minutę kviečia pg_cron. Cron suplanuojamas tik tol, kol yra vykdoma užduotis (kaip kampanijose), o kvietimas tikrinamas vidiniu raktu. Vienas paleidimas trunka iki ~40 s: pasiima N svetainių su `FOR UPDATE SKIP LOCKED`, apdoroja jas lygiagrečiai (pvz. 6 vienu metu) su laiko limitais.
- Atominis tikslas: SQL funkcija `scrape_add_contact()` užrakina darbo eilutę, tikrina `new_count < target`, įterpia su `ON CONFLICT DO NOTHING` ir tik tada didina skaitiklį.
- Pakartojimai: daugiausiai 3 bandymai su didėjančiu laukimu. Pasenę užraktai atstatomi. Kai eilė ir šaltiniai tušti, o tikslas nepasiektas, būsena tampa „exhausted“ su paaiškinimu.
- MX tikrinimas per DNS-over-HTTPS (Cloudflare), nes jis veikia Worker aplinkoje.
- Discovery moduliai atskirti (`osm`, `userUrls`, `firecrawlSearch`), kad vėliau galėtumėte pridėti naujų.
- Įrašas į `AGENTS.md` apie fono darbo architektūrą.
