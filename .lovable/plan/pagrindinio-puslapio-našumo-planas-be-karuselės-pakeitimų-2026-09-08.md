# Pagrindinio puslapio našumo planas (be karuselės pakeitimų)

Tikslas: pakelti mobilų PageSpeed įvertinimą (dabar 78, LCP 4,6 s, FCP 2,9 s) nekeičiant
dizaino, tekstų, karuselės elgsenos ir nekuriant naujų paveikslėlių versijų.

## Ką darysime

1. **Pirmasis ekranas siunčiamas kaip statinis HTML.**
   Pagrindiniai puslapiai (`/` ir `/lt/`) paruošiami iš anksto, todėl naršyklė gauna gatavą
   HTML be serverio laukimo. Tai tiesiogiai mažina FCP ir LCP.

2. **Karuselės medija atidedama iki po pirmo piešimo.**
   Šiuo metu pirmoje scenoje du paveikslėliai siunčiami iš karto ir konkuruoja su tikruoju
   LCP elementu. Paliekame skubų tik tą vieną paveikslėlį, kuris matomas pirmas; likusieji
   pirmos scenos paveikslėliai pakraunami iškart po įkėlimo (elgsena nesikeičia – kai
   scena rodoma, viskas jau vietoje). Vaizdo įrašai ir toliau laukia `load` įvykio.

3. **Aiškus LCP prioritetas.**
   Pirmos scenos pagrindiniam paveikslėliui nurodomas aukštas prioritetas ir jis
   paruošiamas per puslapio `head`, kad naršyklė jo neatidėtų.

4. **Lengvesnis piešimas telefone.**
   Telefono pločiuose išjungiami brangūs vizualiniai efektai, kurių ten beveik nesimato
   (papildomi švytėjimai, `backdrop-filter` blur ant kortelių rėmelių). Kortelių išsidėstymas,
   scenų kaita, animacijos ir visas turinys lieka nepakitę.

5. **Ne pirmo ekrano sekcijų paveikslėliai.**
   Patikriname, kad visi žemiau esančių sekcijų paveikslėliai turi `loading="lazy"`,
   `decoding="async"` ir matmenis, kad neliktų staigių šuolių.

6. **Nenaudojamų failų valymas.**
   `public/media/` yra likę PNG dublikatai (`6_booking.png`, `11_dashboard.png` ir kt.),
   kurių kodas nebenaudoja. Juos pašaliname – mažesnis diegimo paketas, jokio poveikio vaizdui.

## Ko nedarysime

- Nekeičiame karuselės scenų, kortelių, animacijų ar laiko intervalų.
- Nekuriame mažesnių paveikslėlių versijų (jūsų sprendimas).
- Nekeičiame tekstų, maršrutų ir SEO žymų.

## Techninės detalės

- `vite.config.ts`: `tanstackStart.pages` su `/` ir `/lt/`, `prerender: { enabled: true }`,
  `autoStaticPathsDiscovery: false`, kad admin ir kiti privatūs maršrutai nebūtų prerenderinami.
  Jei build'as pakibtų po prerenderio, pridedamas `TSS_PRERENDERING` apsaugotas timeout provider
  ten, kur kuriamas `QueryClient`.
- `src/components/HeroCarousel.tsx`: iš keturių pirmosios scenos vizualų `loading="eager"` +
  `fetchpriority="high"` lieka tik pagrindiniam (`10_new_booking` poster / `8_housekeeping.webp`
  priklausomai nuo matavimo); kiti pereina į `loading="lazy"` ir įjungiami per esamą
  `enableMedia` mechanizmą po `load`.
- `src/routes/index.tsx` ir `src/routes/lt/index.tsx`: `head().links` papildomi
  `rel="preload" as="image" fetchpriority="high"` tik LCP paveikslėliui.
- `src/components/HeroCarousel.css`: `@media (max-width: 980px)` bloke išjungiami
  `backdrop-filter`, antrinis `rc-glow2` ir sunkūs `box-shadow` sluoksniai.
- Patikra: prieš/po matavimas per Lighthouse CLI produkcinei versijai (mobilus profilis),
  papildomai Playwright patikra, kad karuselė vis dar keičia scenas ir nėra klaidų konsolėje.

## Lūkestis

Šie žingsniai realiai turėtų duoti ~88–95 mobiliame. Didžiausias likęs stabdys – 1800 px
pločio paveikslėliai telefone; jei po matavimo pritrūktų iki 90, grįšiu su pasiūlymu dėl
mažesnių versijų.
