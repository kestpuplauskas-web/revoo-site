# Karuselė nerodo aktyvaus (pirmojo) vaizdo įrašo

## Priežastis (patvirtinta)

Duomenų bazėje viskas teisingai: įkeltas vaizdo įrašas yra pozicijoje 0 (aktyvus),
viešai pasiekiamas, o administratoriaus galerijoje „Numatytasis failas" yra tik
sintetinis įrašas, ne DB eilutė.

Problema yra karuselės kode (`src/components/HeroCarousel.tsx`):

1. Karuselė vaizdo įrašams `src` atributą priskiria **rankiniu būdu vieną kartą**
   (`vid.setAttribute("src", vid.dataset["src"])`), kai komponentas užsikrauna.
2. Aktyvūs perrašymai iš duomenų bazės atkeliauja **vėliau** (po hidratacijos,
   `useSlotOverrides`). Tuomet React atnaujina tik `data-src`, bet jau priskirtas
   `src` lieka senas — numatytasis `/media/10_new_booking.mp4`.
3. Nuotraukos (`<img src=...>`) atsinaujina normaliai, todėl klaida matoma tik
   ties vaizdo įrašais (1 scenos kalendorius, kambarinių telefonas, admin telefonas).

## Ką pakeisiu

- `HeroCarousel.tsx`: pridėti efektą, kuris pasikeitus `slots` (atėjus perrašymams)
  sinchronizuoja kiekvieno `<video>` `src` su nauju `data-src`: jei skiriasi —
  priskiria naują, iškviečia `load()`, o jei scena tuo metu rodoma — `play()`.
- Karuselės animacijos, laikas, parallax ir pelės efektai neliečiami.

## Patikra

- `bunx tsgo --noEmit`.
- Playwright: atidaryti pagrindinį puslapį, palaukti hidratacijos ir patikrinti,
  kad 1 scenos `<video>` `src` rodo į įkeltą failą (site-media URL), o ne
  `/media/10_new_booking.mp4`.
