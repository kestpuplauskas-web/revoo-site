// Lithuanian homepage additions (independent from the English file).
export const homeExtrasLt = {
  plans: {
    items: [
      {
        name: "Už vienetą",
        price: "nuo {min} €/mėn.",
        body: "Viena fiksuota mėnesio kaina pagal jūsų vienetų skaičių. Visi moduliai įskaičiuoti.",
      },
      {
        name: "Mokate, kai uždirbate",
        price: "0 €/mėn. + 2 %",
        body: "Tik nuo tiesioginių rezervacijų per jūsų svetainę. 0 % nuo Booking.com ir Airbnb.",
      },
      {
        name: "Individualus",
        price: "Pagal poreikį",
        body: "Dideliems viešbučiams, SPA, vandenlenčių parkams ir vietoms, kur apgyvendinimas – tik dalis verslo.",
      },
    ],
    link: "Palyginti visus planus ir kainas",
  },
  testimonials: {
    eyebrow: "Mūsų klientai",
    h2: "Šeimininkai, kurie nustojo *gaudyti lenteles*",
    items: [
      {
        quote:
          "Diegimas užtruko vieną popietę. Jau per pirmąjį sezoną daugiau svečių rezervavo tiesiogiai mūsų svetainėje, užuot mokėję komisinius platformoms.",
        name: "Guðrún S.",
        role: "Svečių namų savininkė",
        place: "Pietų Islandija",
      },
      {
        quote:
          "Anksčiau tvarkymas buvo skambučiai ir rašteliai. Dabar komanda ryte atsidaro programėlę ir tiesiog žino, kuriuos kambarius tvarkyti pirmiausia.",
        name: "Remigijus J.",
        role: "Boutique viešbutis Dharma Stay",
        place: "Telšiai",
      },
      {
        quote:
          "Sąskaitos sukuriamos tą akimirką, kai svečias išsiregistruoja. Atgavau savo vakarus, o buhalterė pagaliau nustojo man rašyti laiškus.",
        name: "Laura M.",
        role: "Miesto apartamentų šeimininkė",
        place: "Vilnius",
      },
    ],
  },
  guest: {
    title: "Ką mato jūsų svečiai",
    points: [
      "Rezervacija telefonu greičiau nei per minutę",
      "Momentinis patvirtinimas, be laiškų siuntinėjimo pirmyn ir atgal",
      "Saugūs mokėjimai kortele per Stripe",
      "Jūsų prekės ženklas ir jūsų domenas, ne prekyvietė",
    ],
  },
} as const;
