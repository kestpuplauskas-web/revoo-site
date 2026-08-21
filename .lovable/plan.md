# Admin dalis — užklausų valdymas

Sukuriama uždara admin zona revoo.site svetainėje, kurioje matomos ir valdomos demo formos užklausos. Veikimo principas toks pat kaip Halliday Architects projekte: prisijungimas el. paštu, „inbox" tipo užklausų sąrašas, detalus vaizdas šone, statusų valdymas be trynimo.

Šiame etape darome tik **užklausas (leads)**. Klientai, pajamos ir suvestinė bus atskiras darbas vėliau — duomenų struktūra kuriama taip, kad jie prisijungtų be perdarymo.

## Ką gaus vartotojas

- `/admin/prisijungimas` — prisijungimas el. paštu ir slaptažodžiu. Prisijungti gali tik paskyros su `admin` role; kitos iškart atjungiamos.
- `/admin/uzklausos` — užklausų dėžutė:
  - sąrašas naujausios viršuje, neperskaitytos su žyme „Nauja";
  - paieška pagal vardą, el. paštą ar objekto pavadinimą;
  - filtrai: visos / neperskaitytos / archyvuotos;
  - paspaudus eilutę atsidaro šoninis skydelis su visais formos laukais (vardas, el. paštas, objektas, šalis, tipas, vienetų skaičius, dabartinė sistema, pastabos, kalba, data);
  - veiksmai: „Pažymėti kaip perskaitytą / neperskaitytą", „Archyvuoti / Grąžinti". Užklausos netrinamos.
- Šoninis meniu su neperskaitytų užklausų skaičiumi ir atsijungimo mygtuku.
- Vieša demo forma pradeda realiai išsaugoti užklausą, rodo klaidos ir siuntimo būsenas.

Admin sąsaja — tik lietuvių kalba, atskirai nuo svetainės `copy.en.ts` / `copy.lt.ts` failų.

## Techninė dalis

### 1. Lovable Cloud
Įjungiamas Cloud (duomenų bazė + prisijungimai).

### 2. Duomenų bazė (viena migracija)

`public.app_role` enum: `admin`.

`public.user_roles` — `id`, `user_id` (→ `auth.users`), `role`, unikalu `(user_id, role)`.
`public.has_role(_user_id uuid, _role app_role)` — SECURITY DEFINER funkcija, kad RLS politikos neciklintų.

`public.leads`:
`id`, `created_at`, `name`, `email`, `property_name`, `country`, `property_type`, `units`, `current_system`, `notes`, `lang`, `source`, `user_agent`, `read_at`, `archived_at`.
Indeksas `(archived_at, read_at, created_at DESC)`.

GRANT ir RLS:
- `leads`: `INSERT` leidžiamas `anon` ir `authenticated` (vieša forma), `SELECT` ir `UPDATE` tik kai `has_role(auth.uid(), 'admin')`. Jokio `DELETE`. Anonimui `SELECT` neduodamas.
- `user_roles`: `SELECT` `authenticated`, `ALL` `service_role`.

Admin naudotojas sukuriamas po migracijos — užregistruojam paskyrą per `/admin/prisijungimas` ir įrašom `admin` rolę į `user_roles`.

### 3. Serverio funkcijos

`src/lib/leads.functions.ts`:
- `submitLead` — vieša, be autentikacijos. Zod validacija (trim, ilgio ribos, el. pašto formatas), honeypot laukas prieš botus, įrašo eilutę per server publishable klientą.
- `listLeads` — `requireSupabaseAuth`, priima `filter` ir `search`, grąžina sąrašą.
- `updateLead` — `requireSupabaseAuth`, keičia `read_at` / `archived_at`.
- `getMyRole` — `requireSupabaseAuth`, grąžina `{ isAdmin }` per `has_role`.

RLS lieka pagrindine apsauga: net jei kas nors iškviestų funkciją tiesiogiai, be `admin` rolės eilučių negaus.

### 4. Maršrutai (TanStack Start)

- `src/routes/admin/prisijungimas.tsx` — viešas prisijungimo puslapis, `noindex`.
- `src/routes/_authenticated/route.tsx` — integracijos valdomas apsaugos sluoksnis.
- `src/routes/_authenticated/admin.tsx` — admin karkasas: šoninis meniu, rolės patikra, atsijungimas.
- `src/routes/_authenticated/admin.uzklausos.tsx` — užklausų dėžutė.
- `src/routes/_authenticated/admin.index.tsx` — nukreipia į užklausas.

Naudojami jau esami shadcn komponentai (`sheet`, `table`, `badge`, `input`, `button`, `tabs`) ir `sonner` pranešimams.

### 5. Formos prijungimas
`src/components/site/DemoForm.tsx` kviečia `submitLead`, prideda paslėptą honeypot lauką ir `lang`. Sėkmės ekranas lieka toks pat; pridedamos „siunčiama" ir „nepavyko" būsenos.

### 6. SEO
`/admin/*` uždedamas `robots: noindex, nofollow` ir įrašomas `Disallow: /admin` į `public/robots.txt`.

## Ko šiame etape nedarome
- Klientų (pvz. „Rentivo") kartotekos, pajamų ir MRR suvestinės — sekantis etapas.
- El. pašto pranešimų apie naują užklausą — galima pridėti vėliau.
