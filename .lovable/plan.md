# Daugiau kontaktų: mokama paieška + pataisyta miesto paieška

## Ką radau
- Paskutinėje Miami užduotyje **miestas nebuvo išsaugotas**, todėl sistema ieškojo visoje JAV per greitąją paiešką. Rado tik 11 įmonių su svetainėmis, iš jų gavo 36 el. paštus, tada parašė „Šaltiniai išseko“.
- Pats rinkimo principas tinkamas: randamos įmonės, aplankomos jų svetainės, surenkami el. paštai. Bėda ta, kad nemokamame žemėlapyje yra per mažai įmonių. Todėl reikia papildomo šaltinio.

## Ką padarysiu
1. **Prijungsiu mokamą interneto paiešką (Firecrawl).** Pamatysite langelį prijungimui. Ji naudoja kreditus – maždaug 1 kreditas už paieškos rezultatą ir 1 už aplankytą puslapį.
2. **Paiešką pagal frazes įjungsiu automatiškai.** Jei frazių neįrašysite, sistema pati sudarys jas pagal veiklą ir miestą, pvz., „hotel Miami“, „vacation rental Miami“, „guesthouse Miami“, „boutique hotel Miami Beach“. Paieška eis puslapiais, kol pasieksite tikslą.
3. **Miestas visada išsaugomas.** Santraukoje prieš paleidimą bus parodyta „Ieškoma: Miami, JAV“.
4. **Didesnis žemėlapio plotas.** Miestas bus padalintas į dalis, į paiešką įtrauksiu daugiau apgyvendinimo rūšių.
5. **Atmesiu didžiąsias platformas** (Booking, Airbnb, Tripadvisor, Expedia ir pan.), kad kreditai nebūtų išleisti jų puslapiams.
6. **Kreditų saugiklis.** Užduotis sustos, kai bus pasiektas tikslas arba išleistas nustatytas kreditų limitas. Žurnale matysite, kiek kreditų panaudota.
7. **Tęsti užduotį.** Jei šaltinių pritrūko, užduotį galėsite tęsti nekurdami naujos.
8. **Išbandysiu Miami su tikslu 100** ir pranešiu tikrą rezultatą.

## Techninės detalės
- Prijungti Firecrawl ir pasirinkti būdą pagal `uses_connector_gateway` – per gateway arba tiesiogiai.
- `scrape.server.ts`: `/v2/search` su `limit` ir puslapiavimu per frazių variantus; rezultatai keliauja į `scrape_sites` eilę; neleidžiamų domenų sąrašas; kreditų skaitiklis `discovery`.
- Patikrinti, kaip miestas keliauja iš formos į `scrape_jobs.city`; Overpass bbox tinklelis + platesni `tourism` tagai.
- Veiksmas „tęsti“, kai užduoties būsena `exhausted`.
