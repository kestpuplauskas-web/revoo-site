# Pagrindinio puslapio nuotraukų ir vaizdo įrašų valdymas

## Tikslas

Administravimo skiltyje valdyti visas dabartines pagrindinio puslapio nuotraukas ir vaizdo įrašus. Nauji failai kaupiami kaip kandidatai, o svetainėje pasirodo tik paspaudus **„Rodyti svetainėje“**. Tekstų valdymas į šią apimtį neįeina.

## Pagrindinis principas

- Bus 11 fiksuotų medijos vaidmenų, pvz. „Rezervacijų kalendorius“, „Kambarinių savaitė“, „Sąskaita“, „Administravimas telefone“.
- Tas pats vaidmuo gali būti naudojamas keliose pagrindinio puslapio vietose. Aktyvavus vieną kandidatą, jis pasikeis visur, kur tas vaidmuo naudojamas.
- Naujo vaidmens administratorius kurti ar trinti negalės.
- Dabartiniai svetainės failai liks numatytieji ir visada veiks kaip atsarginis variantas.

## Įgyvendinimas keturiais atskirais etapais

### 1. Saugus medijos registras

- Sukurti vaidmenų ir jų kandidatų saugojimą bei atskirą `site-media` talpyklą.
- Įrašyti 11 dabartinių vaidmenų su jų proporcijomis, didžiausiu pločiu ir naudojimo vietų aprašais.
- Viešai leisti gauti tik šiuo metu rodomą kandidatą; visą kandidatų istoriją ir valdymą matys tik administratorius.
- Naujas kandidatas bus įrašomas eilės gale ir pats nebus aktyvuojamas.
- Po šio etapo sustoti ir patikrinti prieigos apsaugą bei registrą.

### 2. Valdymo veiksmai

- Paruošti saugius veiksmus: kandidatų sąrašas, įkėlimas, **„Rodyti svetainėje“**, perkėlimas aukštyn / žemyn ir ištrynimas.
- Aktyvavimą ir eiliškumo pakeitimus atlikti vientisai, kad vienu metu negalėtų atsirasti du aktyvūs failai.
- Vaizdo įrašo kandidatas bus saugomas kartu su jo peržiūros paveikslėliu.
- Trinant aktyvų kandidatą reikės aiškaus patvirtinimo; po trynimo bus rodomas kitas kandidatas arba dabartinis numatytasis failas.
- Po šio etapo sustoti ir patikrinti visus veiksmus.

### 3. Pagrindinio puslapio prijungimas nepabloginant greičio

- Dabartinis statinis pirmasis vaizdas, jo matmenys ir LCP išankstinis įkėlimas lieka nepakeisti.
- Aktyvūs pakeitimai bus gaunami maža atskira užklausa; iki jos atsakymo visada rodomi dabartiniai failai.
- Naujas failas bus parodytas tik visiškai užsikrovęs, todėl nebus tuščio vaizdo ar maketo šuolio.
- Jei duomenų paslauga nepasiekiama, puslapis atrodys ir veiks kaip dabar.
- Karuselės animacija, scenos, laikai ir atidėtas vaizdo įrašų krovimas nebus keičiami.
- Po šio etapo palyginti puslapio vaizdą, CLS, LCP, karuselės veikimą ir klaidas.

### 4. Administravimo skiltis „Pagrindinis puslapis“

- Meniu po „Straipsniai“ pridėti skiltį **„Pagrindinis puslapis“**.
- Kiekvienam vaidmeniui rodyti dabartinį failą, kandidatus, proporcijas, naudojimo vietas ir būseną.
- Veiksmai: **„Įkelti kandidatą“**, **„Rodyti svetainėje“**, aukštyn, žemyn ir ištrinti.
- Nuotraukas automatiškai optimizuoti į WebP, išlaikant konkrečiai vietai reikalingą raišką.
- Vaizdo įrašams priimti MP4 ir kartu prašyti peržiūros paveikslėlio.
- Netinkamas proporcijas aiškiai parodyti prieš įkėlimą; nieko automatiškai nekarpyti. Leisti tęsti tik sąmoningai patvirtinus.
- Sąsają pritaikyti telefonui; perstūmimas veiks mygtukais, ne vien vilkimu.
- Pabaigoje patikrinti visą eigą: įkelti kandidatą, aktyvuoti, pakeisti eiliškumą, grįžti prie seno ir ištrinti.

## Svarbūs patikslinimai nuo pateikto dokumento

- **Įkėlimas nebeaktyvuoja failo automatiškai** — tai atitinka jūsų pasirinktą saugesnį variantą.
- Neaktyvūs kandidatai nebus viešai išvardijami.
- Kadangi pagrindiniai puslapiai dabar paruošiami iš anksto dėl greičio, jų neversime laukti duomenų bazės prieš parodant pirmą ekraną. Taip išsaugomas dabartinis greičio optimizavimas ir patikimas atsarginis vaizdas.
- Tekstų redaktorius paliekamas atskiram būsimam darbui; anglų ir lietuvių tekstai lieka visiškai nepriklausomi.

## Priėmimo kriterijai

1. Nieko neaktyvavus svetainė atrodo ir veikia kaip dabar.
2. Įkeltas kandidatas pats svetainės nepakeičia.
3. Paspaudus „Rodyti svetainėje“, tas pats vaidmuo pasikeičia visose jo naudojimo vietose.
4. Sugedus duomenų paslaugai rodomi dabartiniai numatytieji failai.
5. Visi vaizdai ir vaizdo įrašai išlaiko matmenis; nėra maketo šuolių.
6. Karuselės veikimas ir puslapio tekstai nepasikeičia.
7. Visas valdymas patogiai veikia telefone.
