# Meniu juostos matomumas blog puslapiuose

## Problema
Viršutinė meniu juosta svetainėje yra skaidri, o jos tekstas (logotipas, meniu nuorodos) šviesios spalvos — ji sukurta gulėti ant tamsaus pagrindinio puslapio viršaus. Blog puslapiuose turinys nustumiamas 68 taškais žemyn, todėl po juosta lieka šviesus fonas ir šviesus tekstas tampa nematomas. Atskiro straipsnio puslapyje fonas šviesus visame puslapyje, todėl meniu nematoma visiškai, kol nepraslankiojama žemyn.

## Sprendimas
Meniu juostai pridėti du režimus: skaidrų (kaip dabar pagrindiniame puslapyje) ir „šviesų" — visada su šviesiu fonu ir tamsiu tekstu. Blog puslapiams pritaikyti tinkamą režimą.

## Pakeitimai

1. **Meniu juosta** (`src/components/site/Header.tsx`)
   - Naujas pasirenkamas nustatymas `variant`: `"overlay"` (dabartinis elgesys) arba `"solid"`.
   - Režime `"solid"` juosta nuo pat pradžių turi šviesų, šiek tiek neryškų foną su apatine linija ir tamsų tekstą — tarsi visada būtų „prislankiojusi" būsena.

2. **Blog sąrašo puslapis** (`src/components/site/BlogList.tsx`)
   - Pašalinti 68 taškų tuščią tarpą viršuje — tamsi žalia blog antraštės sritis išsiplečia iki pat ekrano viršaus, po meniu juosta.
   - Viduje srities išlaikomas atstumas, kad tekstas neužliptų po meniu.
   - Meniu lieka skaidraus režimo — šviesus tekstas dabar guli ant tamsaus žalio fono ir puikiai matosi.

3. **Straipsnio puslapis** (`src/components/site/Article.tsx`)
   - Meniu juostai perduoti režimą `"solid"` — visada šviesus fonas ir tamsus tekstas, nes straipsnio fonas šviesus.
   - Tuščias 68 taškų tarpas lieka, kad turinys nepasislėptų po fiksuota juosta.

4. **404 / klaidų būsenos** — blog maršrutų klaidų ekranai neturi meniu; jų nekeičiame.

## Patikra
- Atverti `/blog/`, `/lt/blog/`, vieną straipsnį abiem kalbomis: meniu matosi iškart, neskrolinus.
- Pagrindinis puslapis `/` ir `/lt/` — meniu elgesys nepakitęs (skaidrus viršuje, šviesus fonas pasirodo praslankiojus).
- Typecheck (`bunx tsgo --noEmit`) ir vizuali patikra per naršyklę.
