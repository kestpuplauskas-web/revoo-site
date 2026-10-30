# Paieška pagal frazes be mokamos paslaugos

## Kas vyksta dabar
Pranešimas nėra klaida — rinkimas tęsiasi. Įvestos frazės (pvz. „boutique hotel“) šiuo metu naudojamos tik su mokama interneto paieškos paslauga, kuri neprijungta. Todėl frazės ignoruojamos, o kontaktai renkami DI paieška ir žemėlapiu.

## Ką pakeisiu
1. Frazes perduosiu į jau veikiančią DI paiešką: kiekvienai vietovei DI ieškos įmonių pagal jūsų frazes (pvz. „boutique hotel Miami“, „guesthouse Austin“). Tai padidins rastų svetainių kiekį ir taiklumą.
2. Frazės ir vietovės bus kaitaliojamos, kad 2000 tikslui užtektų įvairių paieškų ir nesikartotų tos pačios svetainės.
3. Klaidinantį įspėjimą pakeisiu aiškiu: „Paieška pagal frazes vykdoma per DI paiešką“.
4. Mokama paieška liktų tik kaip papildoma galimybė, jei kada ją prijungtumėte.

## Techninė dalis
- `src/lib/scrape.server.ts`: DI paieškos užklausoje įtraukti `job.phrases` (rotacija pagal vietovę × frazę), saugoti jau panaudotas kombinacijas, kad nekartotų; žurnalo pranešimą rodyti tik kai frazių nėra ar DI išjungta.
- Patikrinimas: trumpas bandomasis paleidimas su fraze ir vietove, peržiūrėti žurnalą ir naujas eilės svetaines.
