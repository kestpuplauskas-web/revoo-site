# El. laiškų siuntimas iš klientų registro

Leidžia administratoriui iš kliento kortelės rankiniu būdu išsiųsti el. laišką tam vienam klientui. Laiškas generuojamas iš fiksuoto šablono (demo kvietimas, pasiūlymo priminimas, pasiteiravimas), naudojant kliento duomenis ir laisvą admino įvedamą tekstą. Išsiuntimas įrašomas veiksmų istorijoje.

## Prielaida: el. pašto domenas

Projekte dar nėra sukonfigūruoto el. pašto domeno. Pirmas žingsnis — `revoo.site` domeno nustatymas per el. pašto sąrankos langą. Lovable deleguoja subdomeną (pvz. `notify.revoo.site`) ir valdo SPF/DKIM/MX. DNS patikrinimo nereikia kodui — pakanka tik pradėti sąranką.

Siuntimas per Lovable yra tik išsiuntimas — gaunamų laiškų dėžučių ji nevaldo. Kad kliento atsakymas pasiektų komandos narį, adresai kaip `kestutis@revoo.site` turi egzistuoti kaip realios dėžutės (pvz. Google Workspace) — bet tai nėra siuntimo sąlyga.

## 1. El. pašto infrastruktūros sukūrimas

Po domeno sąrankos:
- `scaffold_transactional_email_templates` sukuria: `src/lib/email-templates/registry.ts`, `src/lib/email-templates/send-email.ts` (server-only `sendTemplateEmail` helper), ir peržiūros kelią.
- Įdiegti paketus: `@lovable.dev/email-js@0.1.0`, `@lovable.dev/webhooks-js`, `@react-email/components`, `@react-email/render`.

## 2. El. laiškų šablonai

Trys fiksuoti šablonai `src/lib/email-templates/` kataloge. Kiekvienas — React Email komponentas su brandos spalvomis (teal `#15544e`, cream `#f7f2e7`, amber `#e3a143`, ink `#08201e`), `Body` fonas visada `#ffffff`.

| Šablonas | Failas | Tema | Kada naudoti |
|---|---|---|---|
| `demo-invitation` | `demo-invitation.tsx` | Kvietimas į demonstraciją | Kviečiant klientą į demo |
| `proposal-followup` | `proposal-followup.tsx` | Pasiūlymas iš Revoo | Priminti apie išsiųstą pasiūlymą |
| `follow-up` | `follow-up.tsx` | Informacija iš Revoo | Bendras pasiteiravimas / kontaktas |

Kiekvienas šablonas priima props: `contactName` (kliento vardas), `clientName` (objekto pavadinimas), `message` (admino laisvas tekstas), ir turi fiksuotą CTA mygtuką į `https://revoo.site`. Lovable automatiškai prideda atsisakyimo (unsubscribe) nuorodą kiekvieno laiško apačioje — to pačiam įrankiui pridėti nereikia.

Šablonai užregistruojami `registry.ts` `TEMPLATES` žodyne.

## 3. Serverio funkcija `sendClientEmail`

Nauja funkcija `src/lib/registry.functions.ts`:

```
sendClientEmail({ clientId, templateId, message })
```

- `templateId` — griežtas enum: `'demo-invitation' | 'proposal-followup' | 'follow-up'` (validuojama Zod, ne bet kokia eilutė).
- Gavėjas (`contact_email`) visuomet gaunamas serverio pusėje iš `clients` įrašo — naršyklė niekada neperduoda gavėjo.
- Jei `contact_email` nėra — meta klaidą „Klientas neturi kontaktinio el. pašto".
- Iškviečia `sendTemplateEmail(templateId, contactEmail, { templateData: {...}, idempotencyKey })`.
- Po sėkmingo siuntimo įrašo veiksmą `client_activities` lentelėje (`activity_type: 'email'`, `body: `${templateSubject} — ${message}``).
- `{ sent: false, reason: 'recipient_suppressed' }` — normalus atvejis, ne klaida; rodo pranešimą „Klientas atsisakė laiškų".
- `{ sent: true }` — sėkmė, toast „Laiškas išsiųstas".
- `idempotencyKey` = `client-email-${clientId}-${templateId}-${Date.now()}`.

### Siuntėjas pagal prisijungusį vartotoją

- `profiles` lentelė pridedama kolona `sender_email text` (migracija). Kiekvienas komandos naris susiveda savo siuntėjo adresą (pvz. `kestutis@revoo.site`) — redaguojama kaip ir vardas (vartotojas keičia savo, per tą pačią vietą admino sąsajoje).
- Siunčiant, serverio funkcija paima dabartinio vartotojo `profiles.full_name` ir `sender_email`:
  - Laiško „Nuo:" rodomas kaip `„Kęstutis — Revoo" <kestutis@revoo.site>` (matomas domenas — `revoo.site`, kai sąrankoje įjungtas root-domain rodymas; kitu atveju naudojamas patikrintas subdomenas su tuo pačiu vietiniu vardu, pvz. `kestutis@notify.revoo.site`).
  - `replyTo` visuomet nustatomas į vartotojo `sender_email` — kliento atsakymas nueina tiesiai jam.
- Jei vartotojas nėra susivedęs `sender_email` — naudojamas numatytasis `noreply` siuntėjas su `Revoo` vardu; `replyTo` nededamas.

## 4. Sąsaja kliento kortelėje

`src/routes/_authenticated/admin.registras.$id.tsx`:

- Mygtukas **„Siųsti laišką"** kortelės antraštėje šalia „Išsaugoti" (rodomas tik kai klientas jau išsaugotas, t.y. ne naujas).
- Paspaudus atsidaro dialogas (modal) su:
  - Šablono pasirinkimu (dropdown: Demo kvietimas / Pasiūlymo priminimas / Pasiteiravimas).
  - Gavėjo laukas (tik skaitomas — rodo `contact_email`; jei tuščias, mygtukas blokuojamas su užrašu „Nėra el. pašto").
  - Laisvo teksto laukas (neprivalomas) — admino žinutė, kuri įsilieja į šabloną.
  - Temos peržiūra pagal pasirinktą šabloną.
  - Mygtukas „Siųsti".
- Po išsiuntimo: toast pranešimas, dialogas užsidaro, veiksmų istorija atsinaujina.

## 5. Kas neliečiama

- `clients` lentelės schema — be pakeitimų.
- Esami klientų duomenys, projektai, mokėjimai, laiko įrašai — nepaliesti.
- Veiksmų istorijos trigeris — nepakeistas; el. laiško išsiuntimas įrašomas kaip rankinis veiksmas per serverio funkciją.
- Vieša svetainė, blogas, sitemap, robots — nepaliesti.
- Admin sąsajos kalba — lietuvių.

## 6. Patikros

- Kortelė be `contact_email` — mygtukas rodo „Nėra el. pašto".
- Laiško išsiuntimas sėkmingu atveju — toast + veiksmas istorijoje.
- Suppressed gavėjas — pranešimas apie atsisakymą, ne klaida.
- Pakartotinis to paties šablono siuntimas — veikia (skirtingi idempotencyKey).
- Kiti registro funkcionalumai (filtrai, CSV importas, kortelės redagavimas) — nepakitę.
