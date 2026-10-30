import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pause, Play, RotateCcw, Square, UserPlus } from "lucide-react";

import { BTN, BTN_GHOST, CARD, Field, INPUT, Pill } from "@/components/admin/ui";
import {
  SCRAPE_COUNTRIES,
  controlScrapeJob,
  createScrapeJob,
  getScrapeJobDetail,
  getScrapeOverview,
  importScrapedContacts,
  type ScrapeJob,
} from "@/lib/scrape.functions";

export const Route = createFileRoute("/_authenticated/admin/kontaktu-rinkimas")({
  head: () => ({
    meta: [
      { title: "Kontaktų rinkimas — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: ScrapePage,
});

const CATEGORIES = [
  { v: "accommodation", l: "Apgyvendinimas (visi tipai)" },
  { v: "hotel", l: "Viešbučiai" },
  { v: "boutique_hotel", l: "Butikiniai viešbučiai" },
  { v: "guest_house", l: "Svečių namai / B&B" },
  { v: "apartment", l: "Apartamentai / trumpalaikė nuoma" },
  { v: "hostel", l: "Hosteliai" },
  { v: "motel", l: "Moteliai" },
  { v: "cabin", l: "Nameliai / kotedžai" },
  { v: "camping", l: "Kempingai / glamping" },
  { v: "farm_stay", l: "Sodybos / kaimo turizmas" },
  { v: "villa", l: "Vilos" },
] as const;
const TYPES = [
  { v: "all", l: "Visi verslo kontaktai" },
  { v: "general", l: "Bendriniai (info@…)" },
  { v: "booking", l: "Rezervacijų" },
  { v: "sales", l: "Pardavimų" },
] as const;
const STATUS: Record<string, { l: string; tone: "muted" | "accent" | "warn" }> = {
  running: { l: "Vykdoma", tone: "accent" },
  paused: { l: "Pristabdyta", tone: "warn" },
  stopped: { l: "Sustabdyta", tone: "muted" },
  completed: { l: "Tikslas pasiektas", tone: "accent" },
  exhausted: { l: "Šaltiniai išseko", tone: "warn" },
};

const lines = (s: string) => s.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("lt-LT", { dateStyle: "short", timeStyle: "short" }) : "—");

function ScrapePage() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getScrapeOverview);
  const q = useQuery({
    queryKey: ["scrape-overview"],
    queryFn: () => overviewFn(),
    refetchInterval: (query) => (query.state.data?.jobs.some((j) => j.status === "running") ? 5000 : false),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const jobs = q.data?.jobs ?? [];
  const [tab, setTab] = useState<"active" | "archive">("active");
  const activeJobs = jobs.filter((j) => ["running", "paused"].includes(j.status));
  const archivedJobs = jobs.filter((j) => !["running", "paused"].includes(j.status));
  const shown = tab === "active" ? activeJobs : archivedJobs;
  useEffect(() => {
    if (!selected && activeJobs[0]) setSelected(activeJobs[0].id);
  }, [activeJobs, selected]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl text-ink">Kontaktų rinkimas</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Sistema fone suranda įmones, aplanko jų viešas svetaines ir surenka verslo el. pašto adresus, kol pasiekiamas jūsų tikslas.
          Galite uždaryti naršyklę – darbas tęsis. Duomenų bazėje jau yra {q.data?.totalContacts ?? "…"} surinktų kontaktų.
        </p>
      </header>

      <NewJobForm webReady={!!q.data?.webSearchReady} onCreated={(id) => { setSelected(id); qc.invalidateQueries({ queryKey: ["scrape-overview"] }); }} />

      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink">Užduotys</h2>
        <div role="tablist" className="flex gap-2 border-b border-border">
          {([["active", "Aktyvios", activeJobs.length], ["archive", "Archyvas", archivedJobs.length]] as const).map(([k, l, n]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`-mb-px min-h-11 border-b-2 px-4 text-sm font-medium ${tab === k ? "border-primary text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}>
              {l} <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{n}</span>
            </button>
          ))}
        </div>
        {q.isLoading ? <p className="text-sm text-ink-soft"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Kraunama…</p> : null}
        {shown.length === 0 && !q.isLoading ? <p className="text-sm text-ink-soft">{tab === "active" ? "Šiuo metu aktyvių užduočių nėra." : "Archyvas tuščias."}</p> : null}
        <div className="grid gap-3">
          {shown.map((j) => (
            <JobCard key={j.id} job={j} queue={q.data?.queue[j.id]} open={selected === j.id} onOpen={() => setSelected(selected === j.id ? null : j.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function NewJobForm({ webReady, onCreated }: { webReady: boolean; onCreated: (id: string) => void }) {
  const create = useServerFn(createScrapeJob);
  const [f, setF] = useState({
    name: "", target: 100, countries: ["IS"] as string[], city: "", category: "accommodation",
    phrases: "", urls: "", maxPages: 5, rescan: false, types: ["all"] as string[],
  });
  const [confirm, setConfirm] = useState(false);
  const m = useMutation({
    mutationFn: () => create({ data: {
      name: f.name.trim() || `${f.countries.join(", ")} · ${CATEGORIES.find((c) => c.v === f.category)?.l}`,
      target: f.target, countries: f.countries, city: f.city.trim() || null, category: f.category as never,
      phrases: lines(f.phrases), startUrls: lines(f.urls), maxPages: f.maxPages, rescan: f.rescan, contactTypes: f.types as never,
    } }),
    onSuccess: (r) => { toast.success("Rinkimas pradėtas – sistema dirbs fone"); setConfirm(false); onCreated(r.id); },
    onError: (e) => toast.error((e as Error).message),
  });
  const valid = f.target >= 1 && f.countries.length > 0 && f.types.length > 0;
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <section className={`${CARD} p-6`}>
      <h2 className="font-display text-xl text-ink">Nauja užduotis</h2>
      <div className="mt-5 grid max-w-2xl gap-4">
        <Field label="Tikslinis unikalių kontaktų skaičius *">
          <input type="number" inputMode="numeric" min={1} max={20000} className={INPUT} value={f.target} onChange={(e) => setF({ ...f, target: Math.max(1, Number(e.target.value) || 1) })} />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-xs tracking-wide text-ink-soft uppercase">Šalys *</legend>
          <div className="flex flex-wrap gap-2">
            {SCRAPE_COUNTRIES.map((c) => (
              <label key={c.code} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${f.countries.includes(c.code) ? "border-teal-700 bg-teal-700 text-cream" : "border-ink/15 text-ink"}`}>
                <input type="checkbox" className="sr-only" checked={f.countries.includes(c.code)} onChange={() => setF({ ...f, countries: toggle(f.countries, c.code) })} />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Miestas ar regionas" hint="Nebūtina. Rašykite taip, kaip vadinama vietine kalba, pvz. Reykjavík, Vilnius.">
          <input className={INPUT} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        </Field>
        <Field label="Veiklos sritis *">
          <select className={INPUT} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-xs tracking-wide text-ink-soft uppercase">Kontaktų tipas *</legend>
          <div className="flex flex-wrap gap-3 text-sm text-ink">
            {TYPES.map((t) => (
              <label key={t.v} className="flex items-center gap-2">
                <input type="checkbox" checked={f.types.includes(t.v)} onChange={() => setF({ ...f, types: toggle(f.types, t.v) })} /> {t.l}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Paieškos frazės" hint={webReady ? "Po vieną eilutėje. Naudojamos paieškai internete, kai baigiasi žemėlapio duomenys." : "Paieška internete dar neprijungta, todėl frazės kol kas nenaudojamos. Įmonės ieškomos OpenStreetMap žemėlapyje."}>
          <textarea rows={2} className={INPUT} value={f.phrases} onChange={(e) => setF({ ...f, phrases: e.target.value })} placeholder="guesthouse Iceland" />
        </Field>
        <Field label="Jūsų svetainių sąrašas" hint="Nebūtina. Po vieną adresą eilutėje – jos bus nuskaitytos pirmiausia.">
          <textarea rows={3} className={INPUT} value={f.urls} onChange={(e) => setF({ ...f, urls: e.target.value })} placeholder="https://hotel.is" />
        </Field>
        <details className="text-sm text-ink">
          <summary className="cursor-pointer text-ink-soft">Papildomi nustatymai</summary>
          <div className="mt-3 grid gap-3">
            <Field label="Puslapių vienoje svetainėje (daugiausia)">
              <input type="number" min={1} max={20} className={INPUT} value={f.maxPages} onChange={(e) => setF({ ...f, maxPages: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })} />
            </Field>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.rescan} onChange={(e) => setF({ ...f, rescan: e.target.checked })} /> Nuskaityti ir anksčiau aplankytas svetaines</label>
            <Field label="Užduoties pavadinimas"><input className={INPUT} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          </div>
        </details>

        {confirm ? (
          <div className="rounded-2xl bg-cream p-4 text-sm text-ink">
            <p className="font-medium">Santrauka</p>
            <ul className="mt-2 space-y-1 text-ink-soft">
              <li>Tikslas: <b className="text-ink">{f.target}</b> naujų unikalių kontaktų</li>
              <li>Šalys: {f.countries.map((c) => SCRAPE_COUNTRIES.find((x) => x.code === c)?.label).join(", ")}{f.city ? ` · ${f.city}` : ""}</li>
              <li>Sritis: {CATEGORIES.find((c) => c.v === f.category)?.l} · Tipai: {f.types.map((t) => TYPES.find((x) => x.v === t)?.l).join(", ")}</li>
              <li>Savo svetainių: {lines(f.urls).length} · Frazių: {lines(f.phrases).length}</li>
              <li>Jau esantys registre ar anksčiau surinkti adresai bus praleisti kaip dublikatai.</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <button className={BTN} disabled={m.isPending} onClick={() => m.mutate()}>{m.isPending ? "Paleidžiama…" : "Patvirtinti ir pradėti"}</button>
              <button className={BTN_GHOST} onClick={() => setConfirm(false)}>Atšaukti</button>
            </div>
          </div>
        ) : (
          <div><button className={BTN} disabled={!valid} onClick={() => setConfirm(true)}>Pradėti rinkimą</button></div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[11px] tracking-wide text-ink-soft uppercase">{label}</p>
      <p className="font-display text-xl text-ink">{value}</p>
    </div>
  );
}

function JobCard({ job, queue, open, onOpen }: { job: ScrapeJob; queue?: { queued: number; processing: number } | undefined; open: boolean; onOpen: () => void }) {
  const qc = useQueryClient();
  const control = useServerFn(controlScrapeJob);
  const pct = Math.min(100, Math.round((job.new_count / job.target) * 100));
  const hours = Math.max(1 / 60, (new Date(job.last_activity_at ?? job.started_at).getTime() - new Date(job.started_at).getTime()) / 3_600_000);
  const rate = job.new_count > 0 ? Math.round(job.new_count / hours) : 0;
  const st = STATUS[job.status] ?? { l: job.status, tone: "muted" as const };
  const act = useMutation({
    mutationFn: (action: "pause" | "resume" | "stop" | "retry") => control({ data: { jobId: job.id, action } }),
    onSuccess: () => { toast.success("Atnaujinta"); qc.invalidateQueries({ queryKey: ["scrape-overview"] }); qc.invalidateQueries({ queryKey: ["scrape-detail", job.id] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const canResume = ["paused", "stopped", "exhausted"].includes(job.status) && job.new_count < job.target;

  return (
    <article className={`${CARD} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button className="text-left" onClick={onOpen} aria-expanded={open}>
          <p className="font-display text-lg text-ink">{job.name}</p>
          <p className="text-xs text-ink-soft">Pradėta {fmt(job.started_at)} · paskutinis veiksmas {fmt(job.last_activity_at)}</p>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={st.tone}>{job.status === "running" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}{st.l}</Pill>
          {job.status === "running" ? <button className={BTN_GHOST} onClick={() => act.mutate("pause")}><Pause className="mr-1 inline h-4 w-4" />Pristabdyti</button> : null}
          {canResume ? <button className={BTN_GHOST} onClick={() => act.mutate("resume")}><Play className="mr-1 inline h-4 w-4" />Tęsti</button> : null}
          {job.sites_failed > 0 && job.new_count < job.target ? <button className={BTN_GHOST} onClick={() => act.mutate("retry")}><RotateCcw className="mr-1 inline h-4 w-4" />Pakartoti nepavykusias</button> : null}
          {["running", "paused"].includes(job.status) ? <button className={BTN_GHOST} onClick={() => { if (confirm("Sustabdyti užduotį? Surinkti kontaktai išliks.")) act.mutate("stop"); }}><Square className="mr-1 inline h-4 w-4" />Sustabdyti</button> : null}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-sm text-ink"><span><b>{job.new_count}</b> / {job.target} kontaktų</span><span>{pct}%</span></div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-teal-700 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {job.status_reason ? <p className="mt-3 text-sm text-ink-soft">{job.status_reason}</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        <Stat label="Atrasta įmonių" value={job.discovered_count} />
        <Stat label="Nuskaityta svetainių" value={job.sites_done} />
        <Stat label="Eilėje / apdorojama" value={queue ? `${queue.queued} / ${queue.processing}` : "—"} />
        <Stat label="Nepavyko" value={job.sites_failed} />
        <Stat label="Rasta adresų" value={job.found_count} />
        <Stat label="Nauji" value={job.new_count} />
        <Stat label="Dublikatai" value={job.duplicate_count} />
        <Stat label="Neatitiko kriterijų" value={job.rejected_count} />
        <Stat label="Greitis" value={`${rate} / val.`} />
      </div>

      {open ? <JobDetail job={job} /> : null}
    </article>
  );
}

function JobDetail({ job }: { job: ScrapeJob }) {
  const qc = useQueryClient();
  const detailFn = useServerFn(getScrapeJobDetail);
  const importFn = useServerFn(importScrapedContacts);
  const d = useQuery({ queryKey: ["scrape-detail", job.id, job.new_count, job.sites_done], queryFn: () => detailFn({ data: { jobId: job.id } }) });
  const [filter, setFilter] = useState("");
  const contacts = useMemo(() => (d.data?.contacts ?? []).filter((c) => !filter || `${c.email} ${c.company_name ?? ""} ${c.domain ?? ""}`.toLowerCase().includes(filter.toLowerCase())), [d.data, filter]);
  const notImported = (d.data?.contacts ?? []).filter((c) => !c.imported_client_id).length;
  const imp = useMutation({
    mutationFn: () => importFn({ data: { jobId: job.id } }),
    onSuccess: (r) => { toast.success(`Į registrą perkelta ${r.imported}, praleista ${r.skipped}`); qc.invalidateQueries({ queryKey: ["scrape-detail", job.id] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mt-6 space-y-6 border-t border-ink/10 pt-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg text-ink">Surinkti kontaktai ({d.data?.contacts.length ?? 0})</h3>
          <div className="flex gap-2">
            <input className={`${INPUT} w-56`} placeholder="Ieškoti…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <button className={BTN} disabled={notImported === 0 || imp.isPending} onClick={() => imp.mutate()}>
              <UserPlus className="mr-1 inline h-4 w-4" />{imp.isPending ? "Perkeliama…" : `Perkelti į Klientų registrą (${notImported})`}
            </button>
          </div>
        </div>
        <div className="mt-3 max-h-96 overflow-auto rounded-2xl border border-ink/10">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-cream text-xs text-ink-soft uppercase">
              <tr><th className="p-2">El. paštas</th><th className="p-2">Įmonė</th><th className="p-2">Tipas</th><th className="p-2">Patikimumas</th><th className="p-2">Šaltinis</th><th className="p-2">Registre</th></tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-t border-ink/5">
                  <td className="p-2 text-ink">{c.email}</td>
                  <td className="p-2 text-ink-soft">{c.company_name ?? c.domain}{c.city ? ` · ${c.city}` : ""}</td>
                  <td className="p-2">{({ general: "Bendrinis", booking: "Rezervacijų", sales: "Pardavimų", other: "Kitas" } as Record<string, string>)[c.contact_type] ?? c.contact_type}</td>
                  <td className="p-2">{({ high: "Aukštas", medium: "Vidutinis", low: "Žemas" } as Record<string, string>)[c.confidence]}{c.mx_status === "ok" ? " · MX ✓" : ""}</td>
                  <td className="p-2">{c.source_url?.startsWith("http") ? <a className="text-teal-700 underline" href={c.source_url} target="_blank" rel="noopener noreferrer">puslapis</a> : "—"}</td>
                  <td className="p-2">{c.imported_client_id ? "Taip" : "—"}</td>
                </tr>
              ))}
              {contacts.length === 0 ? <tr><td colSpan={6} className="p-4 text-center text-ink-soft">{d.isLoading ? "Kraunama…" : "Kontaktų dar nėra"}</td></tr> : null}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-soft">Patikrinta adreso forma ir ar domenas priima laiškus (MX). Tai negarantuoja, kad konkreti dėžutė veikia.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-lg text-ink">Žurnalas</h3>
          <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-sm">
            {(d.data?.logs ?? []).map((l) => (
              <li key={l.id} className={l.level === "error" ? "text-red-700" : l.level === "warn" ? "text-amber-800" : "text-ink-soft"}>
                <span className="text-xs">{fmt(l.created_at)}</span> · {l.message}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-display text-lg text-ink">Nepavykusios svetainės</h3>
          <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-sm text-ink-soft">
            {(d.data?.failed ?? []).map((s) => <li key={s.domain}>{s.domain} – {s.error}</li>)}
            {(d.data?.failed.length ?? 0) === 0 ? <li>Nėra</li> : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
