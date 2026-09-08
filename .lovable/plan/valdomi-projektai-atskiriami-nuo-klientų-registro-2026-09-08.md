# Valdomi projektai atskiriami nuo klientų registro

Šiuo metu „Valdomi projektai" tiesiog rodo klientus, kurių būsena nėra „Naujas".
Todėl pakeitus kliento būseną registre, jis automatiškai atsiranda projektuose.
To nebeliks.

## Ką keičiame

- Sąraše rodomi tik realiai sukurti projektai. Vienas įrašas = vienas projektas
  (projekto pavadinimas, klientas, būsena, nuorodos, sukūrimo data).
- Kliento būsenos keitimas registre nieko nebesukuria ir nieko neberodo
  projektuose.
- Viršuje atsiranda mygtukas „Pridėti projektą". Jį paspaudus atsidaro langas:
  - klientas — pasirenkamas iš esamo „Klientų registro" sąrašo (su paieška);
  - projekto pavadinimas;
  - būsena;
  - nuorodos (svetainė, Lovable, GitHub, Supabase) ir paleidimo data —
    neprivalomos.
- Paspaudus įrašą atsidaro tas pats kliento puslapis kaip dabar
  (MAIN / PROJECTS / COMMERCIAL).
- Filtrai ir rikiavimas pritaikomi projektų sąrašui: paieška (projekto arba
  kliento pavadinimas), būsena, šalis, valiuta, naujausi/seniausi.
- KPI kortelės skaičiuojamos pagal projektus turinčius klientus
  (aktyvūs projektai, diegiami projektai, MRR, setup pajamos pagal valiutą).

## Esami duomenys

Kol projektai nesukurti rankiniu būdu, sąrašas bus tuščias — tai laukiamas
rezultatas. Nė vienas klientas, sutartis ar užklausa neištrinama; viskas lieka
matoma „Klientų registre".

## Techninė dalis

- `src/lib/clients.functions.ts`
  - `listClients` pakeičiama į `listProjects`: `projects` + join'as į `clients`
    ir `client_contracts`; nebereikia `.neq("status", "lead")` filtro pagal
    kliento būseną.
  - Nauja `createProject` serverio funkcija (`requireSupabaseAuth`, zod
    validacija: `client_id` uuid privalomas, `project_name` privalomas, kiti
    laukai neprivalomi). Įrašas į `public.projects` — schema jau turi visus
    reikiamus stulpelius, migracijos nereikia.
  - Nauja `listClientOptions` (id, name, company_name) klientų pasirinkimui
    modaliniame lange — grąžina visus registro klientus.
- `src/routes/_authenticated/admin.projektai.index.tsx`
  - naudoja `listProjects`; kortelė rodo projekto pavadinimą, klientą, būseną,
    nuorodas; nuoroda į `/admin/projektai/$clientId/`;
  - pridedamas „Pridėti projektą" mygtukas + modalinis langas su `useMutation`
    ir `queryClient.invalidateQueries`.
- RLS nekeičiama — `projects` jau turi „Admins manage projects" politiką.
- Kliento puslapis `admin.projektai.$id.tsx` ir registras nekeičiami.
