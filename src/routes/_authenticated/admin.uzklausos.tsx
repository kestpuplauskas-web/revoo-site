import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Loader2, Mail, MailOpen, Search } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getMyRole, listLeads, updateLead, type LeadRow } from "@/lib/leads.functions";

export const Route = createFileRoute("/_authenticated/admin/uzklausos")({
  head: () => ({
    meta: [
      { title: "Užklausos — Revoo administravimas" },
      { name: "description", content: "Revoo demo užklausų valdymas." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LeadsPage,
});

type Filter = "all" | "unread" | "archived";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Visos" },
  { key: "unread", label: "Neperskaitytos" },
  { key: "archived", label: "Archyvas" },
];

function LeadsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchRole = useServerFn(getMyRole);
  const fetchLeads = useServerFn(listLeads);
  const patchLead = useServerFn(updateLead);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const role = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });

  const leads = useQuery({
    queryKey: ["leads", filter, search],
    queryFn: () => fetchLeads({ data: { filter, search } }),
    enabled: role.data?.isAdmin === true,
  });

  const mutate = useMutation({
    mutationFn: (input: { id: string; read?: boolean; archived?: boolean }) =>
      patchLead({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Klaida"),
  });

  const rows = leads.data?.leads ?? [];
  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/prisijungimas", replace: true });
  };

  const openLead = (lead: LeadRow) => {
    setSelectedId(lead.id);
    if (!lead.read_at) mutate.mutate({ id: lead.id, read: true });
  };

  if (role.isLoading) {
    return <CenteredState>Kraunama…</CenteredState>;
  }

  if (!role.data?.isAdmin) {
    return (
      <CenteredState>
        <p className="font-display text-2xl text-ink">Neturite administratoriaus teisių</p>
        <p className="mt-2 text-sm text-ink-soft">
          Susisiekite su Revoo komanda, kad jūsų paskyrai būtų suteikta „admin“ rolė.
        </p>
        <button onClick={signOut} className="mt-6 text-sm text-teal-700 underline">
          Atsijungti
        </button>
      </CenteredState>
    );
  }

  return (
    <main className="min-h-screen bg-cream/60 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-ink-soft">Revoo administravimas</p>
            <h1 className="mt-1 font-display text-4xl text-ink">Užklausos</h1>
          </div>
          <button
            onClick={signOut}
            className="rounded-full border border-ink/15 px-5 py-2.5 text-sm text-ink transition-colors hover:bg-ink hover:text-cream"
          >
            Atsijungti
          </button>
        </header>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-full bg-white p-1">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  filter === item.key ? "bg-teal-700 text-cream" : "text-ink-soft hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-[220px] flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-ink-soft"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ieškoti pagal vardą, el. paštą ar objektą"
              aria-label="Ieškoti užklausų"
              className="w-full rounded-full border border-ink/10 bg-white py-2.5 pr-4 pl-11 text-sm text-ink outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-50px_rgba(8,32,30,0.6)]">
            {leads.isLoading ? (
              <div className="flex items-center gap-2 p-8 text-sm text-ink-soft">
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Kraunama…
              </div>
            ) : rows.length === 0 ? (
              <p className="p-8 text-sm text-ink-soft">Užklausų nėra.</p>
            ) : (
              <ul className="divide-y divide-ink/8">
                {rows.map((lead) => (
                  <li key={lead.id}>
                    <button
                      onClick={() => openLead(lead)}
                      className={`flex w-full items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-cream/50 ${
                        selectedId === lead.id ? "bg-cream/70" : ""
                      }`}
                    >
                      <span className="mt-1.5 shrink-0">
                        {lead.read_at ? (
                          <MailOpen aria-hidden="true" className="h-4 w-4 text-ink-soft/60" />
                        ) : (
                          <Mail aria-hidden="true" className="h-4 w-4 text-teal-700" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span
                            className={`truncate ${lead.read_at ? "text-ink" : "font-semibold text-ink"}`}
                          >
                            {lead.name}
                          </span>
                          <span className="text-xs text-ink-soft">{lead.email}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-ink-soft">
                          {lead.property_name}
                          {lead.country ? ` · ${lead.country}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-soft">
                        {formatDate(lead.created_at)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_-50px_rgba(8,32,30,0.6)]">
            {selected ? (
              <div>
                <p className="eyebrow text-ink-soft">{formatDate(selected.created_at, true)}</p>
                <h2 className="mt-1 font-display text-2xl text-ink">{selected.name}</h2>
                <a
                  href={`mailto:${selected.email}`}
                  className="text-sm text-teal-700 underline underline-offset-2"
                >
                  {selected.email}
                </a>

                <dl className="mt-5 space-y-3 text-sm">
                  <Detail label="Objektas" value={selected.property_name} />
                  <Detail label="Šalis" value={selected.country} />
                  <Detail label="Objekto tipas" value={selected.property_type} />
                  <Detail label="Vienetų skaičius" value={selected.units} />
                  <Detail label="Dabartinė sistema" value={selected.current_system} />
                  <Detail label="Kalba" value={selected.lang?.toUpperCase()} />
                  <Detail label="Šaltinis" value={selected.source} />
                </dl>

                {selected.notes ? (
                  <div className="mt-5 rounded-2xl bg-cream/60 p-4 text-sm whitespace-pre-wrap text-ink">
                    {selected.notes}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      mutate.mutate({ id: selected.id, read: selected.read_at === null })
                    }
                    className="rounded-full border border-ink/15 px-4 py-2 text-sm text-ink transition-colors hover:bg-ink hover:text-cream"
                  >
                    {selected.read_at ? "Žymėti neperskaityta" : "Žymėti perskaityta"}
                  </button>
                  <button
                    onClick={() =>
                      mutate.mutate({ id: selected.id, archived: selected.archived_at === null })
                    }
                    className="flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm text-ink transition-colors hover:bg-ink hover:text-cream"
                  >
                    {selected.archived_at ? (
                      <>
                        <ArchiveRestore aria-hidden="true" className="h-4 w-4" /> Grąžinti
                      </>
                    ) : (
                      <>
                        <Archive aria-hidden="true" className="h-4 w-4" /> Archyvuoti
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-soft">Pasirinkite užklausą sąraše.</p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <dt className="w-36 shrink-0 text-ink-soft">{label}</dt>
      <dd className="min-w-0 flex-1 text-ink">{value}</dd>
    </div>
  );
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream/60 px-4 text-center">
      <div>{children}</div>
    </main>
  );
}

function formatDate(value: string, withTime = false) {
  return new Date(value).toLocaleString("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
