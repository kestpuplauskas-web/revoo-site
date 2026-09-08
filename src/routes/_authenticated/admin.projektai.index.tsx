import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Loader2, Search, Settings } from "lucide-react";

import {
  listProjects,
  listClientOptions,
  saveProject,
  PROJECT_STATUSES,
  type ProjectListItem,
} from "@/lib/clients.functions";
import {
  CLIENT_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  formatDate,
  formatMoney,
  NO_DATA,
} from "@/lib/admin-format";
import {
  BTN,
  BTN_GHOST,
  CARD,
  EmptyState,
  Field,
  INPUT,
  KpiCard,
  LinkButtons,
  Pill,
} from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/projektai/")({
  head: () => ({
    meta: [
      { title: "Valdomi projektai — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: ProjectsPage,
});

type Sort = "newest" | "oldest" | "sub_desc" | "sub_asc" | "next_payment";

const SORTS: { key: Sort; label: string }[] = [
  { key: "newest", label: "Naujausi" },
  { key: "oldest", label: "Seniausi" },
  { key: "sub_desc", label: "Didžiausia prenumerata" },
  { key: "sub_asc", label: "Mažiausia prenumerata" },
  { key: "next_payment", label: "Artimiausias mokėjimas" },
];

function ProjectsPage() {
  const fetchProjects = useServerFn(listProjects);
  const query = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [currency, setCurrency] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [addOpen, setAddOpen] = useState(false);

  const projects = query.data?.projects ?? [];
  const kpi = query.data?.kpi;

  const countries = unique(projects.map((p) => p.client.country));
  const types = unique(projects.map((p) => p.client.property_type));
  const currencies = unique(projects.map((p) => p.contract?.currency ?? null));

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = projects.filter((p) => {
      if (status && p.project_status !== status) return false;
      if (country && p.client.country !== country) return false;
      if (propertyType && p.client.property_type !== propertyType) return false;
      if (currency && p.contract?.currency !== currency) return false;
      if (!term) return true;
      return [p.project_name, p.client.name, p.client.company_name]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term));
    });

    const sub = (p: ProjectListItem) => Number(p.contract?.monthly_subscription ?? 0);
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
  }, [projects, search, status, country, propertyType, currency, sort]);

  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-ink-soft">Revoo administravimas</p>
            <h1 className="mt-1 font-display text-4xl text-ink">Valdomi projektai</h1>
            <p className="mt-2 max-w-xl text-sm text-ink-soft">
              Čia matomi tik projektai, kuriuos pridėjote patys. Kliento būsenos keitimas
              „Klientų registre“ projekto nesukuria.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/admin/projektai/nustatymai/"
              className={`${BTN_GHOST} flex items-center gap-2`}
            >
              <Settings className="h-4 w-4" aria-hidden="true" /> Nustatymai
            </Link>
            <button type="button" className={BTN} onClick={() => setAddOpen(true)}>
              Pridėti projektą
            </button>
          </div>
        </header>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Aktyvūs projektai" value={kpi?.activeProjects} />
          <KpiCard label="Diegiami projektai" value={kpi?.onboardingProjects} />
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
              placeholder="Ieškoti pagal projektą arba klientą"
              aria-label="Ieškoti projektų"
              className="w-full rounded-full border border-ink/10 bg-white py-2.5 pr-4 pl-11 text-sm text-ink outline-none focus:border-teal-500"
            />
          </div>
          <FilterSelect value={status} onChange={setStatus} label="Būsena">
            {PROJECT_STATUSES.map((k) => (
              <option key={k} value={k}>
                {PROJECT_STATUS_LABELS[k]}
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
                title={projects.length === 0 ? "Projektų dar nėra" : "Pagal filtrus nieko nerasta"}
                description={
                  projects.length === 0
                    ? "Pardavus produktą pridėkite projektą ir pasirinkite klientą iš „Klientų registro“."
                    : "Pabandykite pakeisti paiešką arba filtrus."
                }
                action={
                  projects.length === 0 ? (
                    <button type="button" className={BTN} onClick={() => setAddOpen(true)}>
                      Pridėti projektą
                    </button>
                  ) : null
                }
              />
            </div>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {rows.map((project) => (
                <li key={project.id} className={`${CARD} p-6`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-2xl text-ink">
                        {project.project_name}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-ink-soft">
                        {project.client.name}
                        {project.client.country ? ` · ${project.client.country}` : ""}
                        {project.client.property_type ? ` · ${project.client.property_type}` : ""}
                      </p>
                    </div>
                    <Pill tone={project.project_status === "active" ? "accent" : "muted"}>
                      {PROJECT_STATUS_LABELS[project.project_status]}
                    </Pill>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <Stat
                      label="Kliento būsena"
                      value={CLIENT_STATUS_LABELS[project.client.status] ?? NO_DATA}
                    />
                    <Stat
                      label="Paleidimas"
                      value={project.launch_date ? formatDate(project.launch_date) : "—"}
                    />
                    <Stat
                      label="Prenumerata"
                      value={
                        project.contract?.monthly_subscription
                          ? formatMoney(
                              project.contract.monthly_subscription,
                              project.contract.currency,
                            )
                          : "—"
                      }
                    />
                    <Stat
                      label="Kitas mokėjimas"
                      value={
                        project.contract?.next_payment_date
                          ? formatDate(project.contract.next_payment_date)
                          : "—"
                      }
                    />
                  </dl>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Link
                      to="/admin/projektai/$id/"
                      params={{ id: project.client_id }}
                      className={BTN}
                    >
                      Atidaryti klientą
                    </Link>
                    <LinkButtons
                      links={[
                        { label: "Website", url: project.website_url },
                        { label: "Lovable", url: project.lovable_url },
                        { label: "GitHub", url: project.github_url },
                        { label: "Supabase", url: project.supabase_url },
                      ]}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {addOpen ? <AddProjectDialog onClose={() => setAddOpen(false)} /> : null}
    </main>
  );
}

function AddProjectDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchClients = useServerFn(listClientOptions);
  const create = useServerFn(saveProject);

  const clientsQuery = useQuery({
    queryKey: ["client-options"],
    queryFn: () => fetchClients(),
  });

  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [projectStatus, setProjectStatus] = useState("planning");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [lovableUrl, setLovableUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const allClients = clientsQuery.data?.clients ?? [];
  const filteredClients = useMemo(() => {
    const term = clientSearch.trim().toLowerCase();
    if (!term) return allClients;
    return allClients.filter((c) =>
      [c.name, c.company_name].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term)),
    );
  }, [allClients, clientSearch]);

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          client_id: clientId,
          project_name: name,
          project_status: projectStatus as (typeof PROJECT_STATUSES)[number],
          website_url: websiteUrl,
          lovable_url: lovableUrl,
          github_url: githubUrl,
          supabase_url: supabaseUrl,
          launch_date: launchDate,
          notes: "",
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onClose();
      navigate({ to: "/admin/projektai/$id/", params: { id: clientId } });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Nepavyko sukurti projekto"),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Pridėti projektą"
    >
      <form
        className={`${CARD} w-full max-w-2xl p-6`}
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (!clientId) {
            setError("Pasirinkite klientą");
            return;
          }
          if (!name.trim()) {
            setError("Įrašykite projekto pavadinimą");
            return;
          }
          mutation.mutate();
        }}
      >
        <h2 className="font-display text-3xl text-ink">Pridėti projektą</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Pasirinkite klientą iš „Klientų registro“ ir aprašykite projektą.
        </p>

        <div className="mt-5 grid gap-4">
          <Field label="Klientas">
            <input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Ieškoti kliento"
              aria-label="Ieškoti kliento"
              className={INPUT}
            />
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              aria-label="Klientas"
              className={`${INPUT} mt-2`}
              size={6}
            >
              <option value="">— pasirinkite klientą —</option>
              {clientsQuery.isLoading ? <option disabled>Kraunama…</option> : null}
              {filteredClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company_name ? ` · ${c.company_name}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Projekto pavadinimas">
            <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Būsena">
              <select
                value={projectStatus}
                onChange={(e) => setProjectStatus(e.target.value)}
                className={INPUT}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Paleidimo data">
              <input
                type="date"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Svetainė">
              <input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Lovable">
              <input
                value={lovableUrl}
                onChange={(e) => setLovableUrl(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="GitHub">
              <input
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Backend">
              <input
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="submit" className={BTN} disabled={mutation.isPending}>
            {mutation.isPending ? "Kuriama…" : "Sukurti projektą"}
          </button>
          <button type="button" className={BTN_GHOST} onClick={onClose}>
            Atšaukti
          </button>
        </div>
      </form>
    </div>
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
