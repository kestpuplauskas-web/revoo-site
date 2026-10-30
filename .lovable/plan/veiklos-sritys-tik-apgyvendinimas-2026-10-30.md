# Veiklos sritys: tik apgyvendinimas

Taip, „Apgyvendinimas (visi tipai)“ jau apima viešbučius, svečių namus, B&B, apartamentus, motelius, hostelius ir namelius. Pakeitimai:

1. Pašalinti „Automobilių nuoma“ ir „Restoranai“.
2. Palikti „Apgyvendinimas (visi tipai)“ kaip pirmą ir numatytą pasirinkimą.
3. Pridėti atskirus tipus: Viešbučiai, Butikiniai viešbučiai, Svečių namai / B&B, Apartamentai / trumpalaikė nuoma, Hosteliai, Moteliai, Nameliai / kotedžai (cabins), Kempingai / glamping, Sodybos / kaimo turizmas, Vilos.
4. „Visi tipai“ apraše įtraukti ir naujus tipus (kempingai, glamping, vilos, sodybos).
5. Jau sukurtos senos užduotys su automobilių nuoma ar restoranais lieka istorijoje ir rodomos be klaidų.

## Techninė dalis
- Admin formos sąrašas, serverio validacija (enum), DI aprašai (`CATEGORY_LABEL`), žemėlapio žymos (`CATEGORY_OSM`: tourism=hotel/hostel/motel/guest_house/apartment/chalet/camp_site, kt.) ir raktažodžiai atnaujinami kartu.
- Seni `car_rental`/`restaurant` paliekami tik rodymui istorijoje, naujoms užduotims neleidžiami.
