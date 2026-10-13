import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Loader2, Search, Upload, X } from "lucide-react";

import { listRegistry, REGISTRY_STATUSES } from "@/lib/registry.functions";
import { CLIENT_STATUS_LABELS, formatDate } from "@/lib/admin-format";
import { BTN, BTN_GHOST, CARD, EmptyState, KpiCard, Pill } from "@/components/admin/ui";

const registrySearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "").default(""),
  assignee: fallback(z.string(), "").default(""),
  country: fallback(z.string(), "").default(""),
  next: fallback(z.string(), "").default(""),
  page: fallback(z.string(), "1").default(""),
  perPage: fallback(z.string(), "50").default(""),
});

export const Route = createFileRoute("/_authenticated/admin/registras/")({
  validateSearch: zodValidator(registrySearchSchema),
  head: () => ({
    meta: [
      { title: "Klientų registras — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: RegistryPage,
});

type NextState = "" | "overdue" | "today" | "upcoming" | "none";

function RegistryPage() {
  const fetchRegistry = useServerFn(listRegistry);
  const query = useQuery({ queryKey: ["registry"], queryFn: () => fetchRegistry() });

  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  const setParam = (key: keyof typeof search, value: string) =>
    navigate({
      replace: true,
      search: (prev) => ({ ...prev, [key]: value }),
    });

  const setParamFiltered = (key: keyof typeof search, value: string) =>
    navigate({
      replace: true,
      search: (prev) => ({ ...prev, [key]: value, page: "1" }),
    });

  const setSearch = (v: string) => setParamFiltered("q", v);
  const setStatus = (v: string) => setParamFiltered("status", v);
  const setAssignee = (v: string) => setParamFiltered("assignee", v);
  const setCountry = (v: string) => setParamFiltered("country", v);
  const setNextState = (v: NextState) => setParamFiltered("next", v);

  const setPage = (p: number) => setParam("page", String(p));
  const setPerPage = (v: number) =>
    navigate({
      replace: true,
      search: (prev) => ({ ...prev, perPage: String(v), page: "1" }),
    });

  const { q: searchTerm, status, assignee, country } = search;
  const nextState = search["next"] as NextState;

  const hasFilters = Boolean(searchTerm || status || assignee || country || nextState);
  const clearFilters = () =>
    navigate({
      search: {
        q: "",
        status: "",
        assignee: "",
        country: "",
        next: "",
        page: "1",
        perPage: "50",
      },
    });

  const clients = query.data?.clients ?? [];
  const team = query.data?.team ?? [];
  const mail = query.data?.mail ?? {};
  const today = query.data?.today ?? new Date().toISOString().slice(0, 10);

  const teamName = (id: string | null) =>
    (team.find((t) => t.id === id)?.full_name ?? team.find((t) => t.id === id)?.email ?? null) ||
    null;

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = clients.filter((c) => {
      if (status && c.status !== status) return false;
      if (country && (c.country ?? "") !== country) return false;
      if (assignee === "none" ? Boolean(c.assigned_to) : assignee && c.assigned_to !== assignee)
        return false;
      if (nextState) {
        const d = c.next_action_date;
        if (nextState === "none" && d) return false;
        if (
          nextState === "overdue" &&
          !(d && d < today && c.status !== "cancelled")
        )
          return false;
        if (nextState === "today" && d !== today) return false;
        if (nextState === "upcoming" && !(d && d > today)) return false;
      }
      if (!term) return true;
      return [c.name, c.contact_email, c.developer, c.notes]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term));
    });

    const overdue = (c: (typeof clients)[number]) =>
      c.next_action_date && c.next_action_date < today && c.status !== "cancelled" ? 0 : 1;

    return [...filtered].sort((a, b) => {
      const byOverdue = overdue(a) - overdue(b);
      if (byOverdue !== 0) return byOverdue;
      const ad = a.next_action_date ?? "9999-12-31";
      const bd = b.next_action_date ?? "9999-12-31";
      if (ad !== bd) return ad.localeCompare(bd);
      return b.created_at.localeCompare(a.created_at);
    });
  }, [clients, searchTerm, status, country, assignee, nextState, today]);

  const filteredSummary = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const c of rows) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    return {
      total: rows.length,
      byStatus,
      overdue: rows.filter(
        (c) =>
          c.next_action_date && c.next_action_date < today && c.status !== "cancelled",
      ).length,
      unassigned: rows.filter((c) => !c.assigned_to).length,
    };
  }, [rows, today]);

  const countries = useMemo(
    () =>
      [...new Set(clients.map((c) => c.country).filter((v): v is string => Boolean(v)))].sort(
        (a, b) => a.localeCompare(b, "lt"),
      ),
    [clients],
  );

  const perPageOptions = [20, 50, 100];
  const perPage = perPageOptions.includes(Number(search["perPage"]))
    ? Number(search["perPage"])
    : 50;
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const page = Math.min(Math.max(1, Number(search["page"]) || 1), totalPages);
  const pageRows = useMemo(
    () => rows.slice((page - 1) * perPage, page * perPage),
    [rows, page, perPage],
  );

  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-ink-soft">Revoo administravimas</p>
            <h1 className="mt-1 font-display text-4xl text-ink">Klientų registras</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/registras/importas/" className={`${BTN_GHOST} flex items-center gap-2`}>
              <Upload className="h-4 w-4" aria-hidden="true" /> Importuoti Excel / CSV
            </Link>
            <Link to="/admin/registras/$id/" params={{ id: "naujas" }} className={BTN}>
              Pridėti klientą
            </Link>
          </div>
        </header>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="IŠ VISO KLIENTŲ" value={filteredSummary.total} />
          <KpiCard label="Pradelsti veiksmai" value={filteredSummary.overdue} />
          <KpiCard label="Be atsakingo" value={filteredSummary.unassigned} />
          <KpiCard
            label="Piltuvėlyje"
            value={
              Object.entries(filteredSummary.byStatus)
                .filter(([k]) => !["won", "lost", "cancelled"].includes(k))
                .reduce((acc, [, v]) => acc + v, 0)
            }
          />
        </div>

        <div className={`${CARD} mt-4 flex flex-wrap gap-2 p-4`}>
          {REGISTRY_STATUSES.filter((s) => (filteredSummary.byStatus[s] ?? 0) > 0).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(status === s ? "" : s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                status === s ? "bg-teal-700 text-cream" : "bg-cream text-ink-soft"
              }`}
            >
              {CLIENT_STATUS_LABELS[s]}: {filteredSummary.byStatus[s]}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-ink-soft"
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ieškoti pagal pavadinimą, el. paštą, statytoją ar pastabą"
              aria-label="Ieškoti objektų"
              className="w-full rounded-full border border-ink/10 bg-white py-2.5 pr-4 pl-11 text-sm text-ink outline-none focus:border-teal-500"
            />
          </div>
          <Select value={status} onChange={setStatus} label="Statusas">
            {REGISTRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLIENT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select value={assignee} onChange={setAssignee} label="Atsakingas">
            <option value="none">Be atsakingo</option>
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name ?? t.email}
              </option>
            ))}
          </Select>
          <Select value={country} onChange={setCountry} label="Šalis">
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            value={nextState}
            onChange={(v) => setNextState(v as NextState)}
            label="Kitas veiksmas"
          >
            <option value="overdue">Vėluoja</option>
            <option value="today">Šiandien</option>
            <option value="upcoming">Būsimi</option>
            <option value="none">Nenustatytas</option>
          </Select>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-ink hover:text-cream"
            >
              <X className="h-4 w-4" aria-hidden="true" /> Šalinti filtrus
            </button>
          ) : null}
        </div>

        <div className="mt-6">
          {query.isLoading ? (
            <div className={`${CARD} flex items-center gap-2 p-8 text-sm text-ink-soft`}>
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Kraunama…
            </div>
          ) : rows.length === 0 ? (
            <div className={CARD}>
              <EmptyState
                title={clients.length === 0 ? "Objektų dar nėra" : "Pagal filtrus nieko nerasta"}
                description={
                  clients.length === 0
                    ? "Pridėkite pirmą objektą arba importuokite sąrašą iš CSV failo."
                    : "Pabandykite pakeisti paiešką arba filtrus."
                }
                action={
                  clients.length === 0 ? (
                    <Link to="/admin/registras/$id/" params={{ id: "naujas" }} className={BTN}>
                      Pridėti objektą
                    </Link>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className={CARD}>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={rows.length}
                perPage={perPage}
                onPage={setPage}
                onPerPage={setPerPage}
              />
              <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] table-fixed text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-xs tracking-wide text-ink-soft uppercase">
                    <th className="px-3 py-2 font-medium w-[24%]">El. Paštas</th>
                    <th className="px-3 py-2 font-medium w-[8%]">Šalis</th>
                    <th className="px-3 py-2 font-medium w-[14%]">Išsiųsta laiškų</th>
                    <th className="px-3 py-2 font-medium w-[13%]">Statusas</th>
                    <th className="px-3 py-2 font-medium w-[12%]">Telefonas</th>
                    <th className="px-3 py-2 font-medium w-[14%]">Kitas veiksmas</th>
                    <th className="px-3 py-2 font-medium w-[9%]">Atsakingas</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap w-[11%]">Sukurta</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c) => {
                    const isOverdue = Boolean(
                      c.next_action_date && c.next_action_date < today && c.status !== "cancelled",
                    );
                    const sub = [
                      c.city,
                      c.property_type,
                      c.units_count ? `${c.units_count} kamb.` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    const campaigns = mail[c.id]?.campaigns ?? [];
                    return (
                      <tr
                        key={c.id}
                        className="group border-b border-ink/5 transition-colors last:border-0 hover:bg-cream/60"
                      >
                        <td className="px-3 py-3">
                          <Link
                            to="/admin/registras/$id/"
                            params={{ id: c.id }}
                            search={(prev) => prev}
                            className="block max-w-full truncate font-medium text-ink group-hover:underline"
                            title={c.contact_email ?? c.name}
                          >
                            {c.contact_email ?? c.name}
                            <span className="mt-0.5 block max-w-full truncate text-xs font-normal text-ink-soft">
                              {[c.city, c.property_type, c.units_count ? `${c.units_count} kamb.` : null]
                                .filter(Boolean)
                                .join(" · ") || " "}
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-1.5 text-ink">{c.country ?? "—"}</td>
                        <td className="px-3 py-1.5 text-ink" title={campaigns.join(", ")}>
                          {mail[c.id]?.count ?? 0}
                          {campaigns.length ? (
                            <span className="block max-w-full truncate text-xs text-ink-soft">
                              {campaigns.join(", ")}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <Pill tone={c.status === "won" ? "accent" : "muted"}>
                              {CLIENT_STATUS_LABELS[c.status]}
                            </Pill>
                            {isOverdue ? (
                              <span
                                role="img"
                                aria-label="Pradelsta"
                                title="Pradelsta"
                                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-amber ring-2 ring-amber/25"
                              />
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-ink">
                          {c.contact_phone ? (
                            <a
                              href={`tel:${c.contact_phone}`}
                              className="hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {c.contact_phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          <Link
                            to="/admin/registras/$id/"
                            params={{ id: c.id }}
                            search={(prev) => prev}
                            className="flex max-w-full items-baseline gap-1.5"
                            title={c.next_action ?? ""}
                          >
                            <span
                              className={`min-w-0 truncate ${isOverdue ? "font-medium text-ink" : "text-ink"}`}
                            >
                              {c.next_action || "—"}
                            </span>
                            {c.next_action_date ? (
                              <span className="shrink-0 text-xs text-ink-soft">
                                {formatDate(c.next_action_date)}
                              </span>
                            ) : null}
                          </Link>
                        </td>
                        <td className="px-3 py-1.5 text-ink">{teamName(c.assigned_to) ?? "—"}</td>
                        <td className="px-3 py-1.5 text-ink whitespace-nowrap">
                          {formatDate(c.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={rows.length}
                perPage={perPage}
                onPage={setPage}
                onPerPage={setPerPage}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Select({
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
      <option value="">{label}: visi</option>
      {children}
    </select>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  perPage,
  onPage,
  onPerPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (v: number) => void;
}) {
  const btnClass =
    "rounded-full border border-ink/15 px-4 py-1.5 text-sm transition-colors hover:bg-ink hover:text-cream disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <p className="text-ink-soft">
        Puslapis {page} iš {totalPages} · iš viso {total} įrašų
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={perPage}
          onChange={(e) => onPerPage(Number(e.target.value))}
          aria-label="Įrašų skaičius puslapyje"
          className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-teal-500"
        >
          {[20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} įrašų
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Ankstesnis puslapis"
          className={btnClass}
        >
          Ankstesnis
        </button>
        <span className="text-ink-soft" aria-current="page">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Sekantis puslapis"
          className={btnClass}
        >
          Sekantis
        </button>
      </div>
    </div>
  );
}
