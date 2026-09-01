import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Loader2, Search, Settings } from "lucide-react";

import { listClients, type ClientListItem } from "@/lib/clients.functions";
import {
  CLIENT_STATUS_LABELS,
  formatDate,
  formatMoney,
  NO_DATA,
} from "@/lib/admin-format";
import { BTN, BTN_GHOST, CARD, EmptyState, KpiCard, LinkButtons, Pill } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/projektai/")({
  head: () => ({
    meta: [
      { title: "Valdomi projektai — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: ClientsPage,
});

type Sort =
  | "newest"
  | "oldest"
  | "sub_desc"
  | "sub_asc"
  | "next_payment";

const SORTS: { key: Sort; label: string }[] = [
  { key: "newest", label: "Naujausi" },
  { key: "oldest", label: "Seniausi" },
  { key: "sub_desc", label: "Didžiausia prenumerata" },
  { key: "sub_asc", label: "Mažiausia prenumerata" },
  { key: "next_payment", label: "Artimiausias mokėjimas" },
];

function ClientsPage() {
  const fetchClients = useServerFn(listClients);
  const query = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [currency, setCurrency] = useState("");
  const [payment, setPayment] = useState("");
  const [sort, setSort] = useState<Sort>("newest");

  const clients = query.data?.clients ?? [];
  const kpi = query.data?.kpi;

  const countries = unique(clients.map((c) => c.country));
  const types = unique(clients.map((c) => c.property_type));
  const currencies = unique(clients.map((c) => c.contract?.currency ?? null));

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = clients.filter((c) => {
      if (status && c.status !== status) return false;
      if (country && c.country !== country) return false;
      if (propertyType && c.property_type !== propertyType) return false;
      if (currency && c.contract?.currency !== currency) return false;
      // Mokėjimo būsena išvedama iš payments (3 fazė) — kol kas visiems „Nėra duomenų“.
      if (payment && payment !== "none") return false;
      if (!term) return true;
      return [c.name, c.company_name, c.contact_name, c.contact_email]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term));
    });

    const sub = (c: ClientListItem) => Number(c.contract?.monthly_subscription ?? 0);
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.created_at.localeCompare(b.created_at);
        case "sub_desc":
          return sub(b) - sub(a);
        case "sub_asc":
          return sub(a) - sub(b);
        case "next_payment": {
          const av = a.contract?.next_payment_date ?? "9999-12-31";
          const bv = b.contract?.next_payment_date ?? "9999-12-31";
          return av.localeCompare(bv);
        }
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
    return sorted;
  }, [clients, search, status, country, propertyType, currency, payment, sort]);

  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-ink-soft">Revoo administravimas</p>
            <h1 className="mt-1 font-display text-4xl text-ink">Valdomi projektai</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/projektai/nustatymai/" className={`${BTN_GHOST} flex items-center gap-2`}>
              <Settings className="h-4 w-4" aria-hidden="true" /> Nustatymai
            </Link>
            <Link to="/admin/projektai/$id/" params={{ id: "naujas" }} className={BTN}>
              Pridėti klientą
            </Link>
          </div>
        </header>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Aktyvūs klientai" value={kpi?.activeClients} />
          <KpiCard label="Diegiami klientai" value={kpi?.onboardingClients} />
          <KpiCard label="MRR pagal valiutą" totals={kpi?.mrr ?? []} />
          <KpiCard
            label="Setup revenue"
            totals={kpi?.setupRevenue ?? []}
            note="Iš sutarčių numatytos sumos, ne faktas."
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Atviri support kreipiniai" value="Ruošiama" />
          <KpiCard label="Support valandos šį mėnesį" value="Ruošiama" />
          <KpiCard label="Bendras laikas šį mėnesį" value="Ruošiama" />
          <KpiCard label="Neapmokėta suma" value="Ruošiama" />
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-ink-soft"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ieškoti pagal klientą, įmonę, kontaktą ar el. paštą"
              aria-label="Ieškoti klientų"
              className="w-full rounded-full border border-ink/10 bg-white py-2.5 pr-4 pl-11 text-sm text-ink outline-none focus:border-teal-500"
            />
          </div>
          <FilterSelect value={status} onChange={setStatus} label="Būsena">
            {Object.entries(CLIENT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect value={country} onChange={setCountry} label="Šalis">
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect value={propertyType} onChange={setPropertyType} label="Objekto tipas">
            {types.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect value={currency} onChange={setCurrency} label="Valiuta">
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect value={payment} onChange={setPayment} label="Mokėjimo būsena">
            <option value="none">{NO_DATA}</option>
          </FilterSelect>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Rikiavimas"
            className="rounded-full border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-teal-500"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6">
          {query.isLoading ? (
            <div className={`${CARD} flex items-center gap-2 p-8 text-sm text-ink-soft`}>
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Kraunama…
            </div>
          ) : rows.length === 0 ? (
            <div className={CARD}>
              <EmptyState
                title={clients.length === 0 ? "Klientų dar nėra" : "Pagal filtrus nieko nerasta"}
                description={
                  clients.length === 0
                    ? "Pridėkite pirmą klientą — vėliau prie jo galėsite prikabinti projektus, komercines sąlygas ir istoriją."
                    : "Pabandykite pakeisti paiešką arba filtrus."
                }
                action={
                  clients.length === 0 ? (
                    <Link to="/admin/projektai/$id/" params={{ id: "naujas" }} className={BTN}>
                      Pridėti klientą
                    </Link>
                  ) : null
                }
              />
            </div>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {rows.map((client) => (
                <li key={client.id} className={`${CARD} p-6`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-2xl text-ink">{client.name}</p>
                      <p className="mt-0.5 truncate text-sm text-ink-soft">
                        {[client.country, client.city].filter(Boolean).join(", ") || "—"}
                        {client.property_type ? ` · ${client.property_type}` : ""}
                        {client.units_count ? ` · ${client.units_count} vnt.` : ""}
                      </p>
                    </div>
                    <Pill tone={client.status === "active" ? "accent" : "muted"}>
                      {CLIENT_STATUS_LABELS[client.status]}
                    </Pill>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <Stat
                      label="Prenumerata"
                      value={
                        client.contract?.monthly_subscription
                          ? formatMoney(
                              client.contract.monthly_subscription,
                              client.contract.currency,
                            )
                          : "—"
                      }
                    />
                    <Stat
                      label="Kitas mokėjimas"
                      value={
                        client.contract?.next_payment_date
                          ? formatDate(client.contract.next_payment_date)
                          : "—"
                      }
                    />
                    <Stat label="Projektai" value={client.projects_count || "—"} />
                    <Stat label="Mokėjimo būsena" value={NO_DATA} />
                  </dl>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Link
                      to="/admin/projektai/$id/"
                      params={{ id: client.id }}
                      className={BTN}
                    >
                      Atidaryti klientą
                    </Link>
                    <LinkButtons
                      links={[
                        { label: "Website", url: client.first_project_links?.website_url },
                        { label: "Lovable", url: client.first_project_links?.lovable_url },
                        { label: "GitHub", url: client.first_project_links?.github_url },
                        { label: "Supabase", url: client.first_project_links?.supabase_url },
                      ]}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-ink-soft uppercase">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="rounded-full border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-teal-500"
    >
      <option value="">{label}: visos</option>
      {children}
    </select>
  );
}

function unique(values: (string | null)[]) {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) =>
    a.localeCompare(b, "lt"),
  );
}
