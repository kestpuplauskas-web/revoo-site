# Dviejų straipsnių importas

## Trumpas atsakymas

Taip, formatas tinkamas. SQL atitinka esamą straipsnių lentelę: kalba, adresas (slug), antraštė, H1, SEO antraštė ir aprašymas, santrauka, turinio blokai, būsena ir data. Blokų tipai (pastraipa, antraštė, sąrašai) yra būtent tie, kuriuos svetainė moka rodyti — patikrinta: LT 63 blokai, EN 53 blokai, jokių nepažįstamų laukų. Skaitymo trukmė apskaičiuojama automatiškai, pakartotinis paleidimas įrašų nedubliuoja.

Atskiri `blocks-lt.json` ir `blocks-en.json` failai nereikalingi — tas pats turinys jau yra SQL viduje. Naudingi tik kaip atsarginė kopija.

## Ką verta pataisyti prieš importą

- SEO aprašymai per ilgi pagal anksčiau sutartą taisyklę (140–155 simbolių): lietuviškas 174, angliškas 182. Sutrumpinsiu abu iki normos, prasmės nekeisdamas.
- Straipsniai neturi viršelio nuotraukos (laukai lieka tušti). Tai leidžiama; jei norite viršelių, atsiųskite paveikslėlius ir aprašymus.
- Straipsniai nesusieti kaip vienas kito vertimas — teisinga, nes tai skirtingos temos.

## Veiksmai

1. Sutrumpinti abu SEO aprašymus iki 140–155 simbolių.
2. Paleisti importą į duomenų bazę (du paskelbti straipsniai, data 2026-09-08).
3. Patikrinti, kad puslapiai atsidaro: `/lt/blog/e-turistas-ntis-vadovas/` ir `/blog/icelandic-vsk-accommodation-11-vs-24/`, ir kad jie atsiranda straipsnių sąraše bei svetainės žemėlapyje.
