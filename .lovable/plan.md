# Kodėl Miami davė tik 36 kontaktus ir kaip pataisyti

## Ką radau
- Paskutinėje užduotyje **miestas neišsaugotas** – sistema ieškojo „visoje JAV“, o ne Miami.
- Greitoji visos šalies paieška grąžino tik 11 įmonių su svetainėmis, iš jų surinkta 36 el. paštai. Todėl rodoma „Šaltiniai išseko“.

## Ką padarysiu
1. **Miestas visada išsaugomas ir naudojamas.** Patikrinsiu formą: įrašytas miestas (pvz., Miami) privalo patekti į užduotį. Santraukoje prieš paleidimą bus aiškiai parodyta „Ieškoma: Miami, JAV“.
2. **Didesnė miesto paieška.** Miesto plotą sistema padalins į kelias dalis ir ieškos kiekvienoje atskirai, taip pat įtrauks platesnes apgyvendinimo rūšis (viešbučiai, apartamentai, svečių namai, moteliai, hosteliai, kempingai). Jei tikslas nepasiektas, paieškos ratas automatiškai išplečiamas į aplinkines vietoves.
3. **Aiškesnis žurnalas.** Bus rodoma, kokiame mieste ir kokiame plote ieškota, ir kiek rasta kiekviename žingsnyje.
4. **Galimybė tęsti.** Pasibaigusią užduotį galėsite „Tęsti su didesniu plotu“, nekuriant naujos.

## Ką verta žinoti
- Nemokamas žemėlapio šaltinis Miami rajone realiai gali duoti apie 60–150 kontaktų. Patikimai 100+ kiekvienam miestui reikėtų prijungti mokamą paiešką pagal frazes – tai atskiras žingsnis, jei norėsite.
- Po pakeitimų išbandysiu Miami su tikslu 100 ir pranešiu tikrą rezultatą.

## Techninės detalės
- Patikrinti `city` perdavimą forma → server function → `scrape_jobs.city`.
- `scrape.server.ts`: Nominatim bbox → tinklelis (pvz. 3×3) Overpass užklausoms, išplėsti `tourism=*` tagus, bbox didinimas kai išsenka; fallback taip pat pagal miestą.
- Pridėti „resume with expanded area“ veiksmą statusui `exhausted`.
