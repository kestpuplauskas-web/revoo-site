import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createCampaign,
  deleteCampaign,
  deleteSender,
  getCampaignOverview,
  listRecipients,
  previewAudience,
  removeUnsubscribe,
  runTickNow,
  sendTestEmail,
  setCampaignStatus,
  upsertSender,
  type AudienceFilters,
  type SenderRow,
} from "@/lib/campaigns.functions";
import { listTemplates } from "@/lib/templates.functions";
import { ALL_STATUSES } from "@/lib/registry.functions";
import { CLIENT_STATUS_LABELS } from "@/lib/admin-format";
import { BTN, BTN_GHOST, CARD, Field, INPUT, Pill } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/kampanijos")({
  head: () => ({
    meta: [
      { title: "Kampanijos — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: CampaignsPage,
});

type Tab = "campaigns" | "senders" | "unsubs";
const STATUS_TEXT: Record<string, string> = {
  draft: "Juodraštis",
  running: "Vykdoma",
  paused: "Pristabdyta",
  completed: "Užbaigta",
  cancelled: "Nutraukta",
};
const R_STATUS: Record<string, string> = {
  pending: "Laukia",
  sending: "Siunčiama",
  sent: "Išsiųsta",
  failed: "Klaida",
  skipped: "Praleista",
  unsubscribed: "Atsisakė",
};

function useOverview() {
  const fetch = useServerFn(getCampaignOverview);
  return useQuery({ queryKey: ["campaigns"], queryFn: () => fetch(), refetchInterval: 30000 });
}

function CampaignsPage() {
  const [tab, setTab] = useState<Tab>("campaigns");
  const q = useOverview();
  const d = q.data;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-10">
      <h1 className="font-display text-3xl text-ink">Kampanijos</h1>
      <p className="mt-1 text-sm text-ink-soft">
        El. laiškų kampanijos klientų registro kontaktams su siuntėjų rotacija ir dienos limitais.
      </p>

      {d && !d.sesReady ? (
        <div className="mt-5 rounded-2xl bg-amber/30 px-4 py-3 text-sm text-ink">
          Siuntimo kanalas (Amazon SES) dar neprijungtas — kampanijas galite kurti, bet laiškai nebus siunčiami.
        </div>
      ) : null}

      <div className="mt-6 flex gap-2" role="tablist">
        {(
          [
            ["campaigns", "Kampanijos"],
            ["senders", `Siuntėjai${d ? ` (${d.senders.length})` : ""}`],
            ["unsubs", `Atsisakę${d ? ` (${d.unsubscribes.length})` : ""}`],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`min-h-11 rounded-full px-4 text-sm ${tab === k ? "bg-ink text-cream" : "bg-white text-ink"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {q.isLoading ? <p className="mt-8 text-sm text-ink-soft">Kraunama…</p> : null}
      {q.error ? <p className="mt-8 text-sm text-red-700">Nepavyko įkelti duomenų.</p> : null}
      {d && tab === "campaigns" ? <CampaignsTab data={d} /> : null}
      {d && tab === "senders" ? <SendersTab senders={d.senders} /> : null}
      {d && tab === "unsubs" ? <UnsubsTab rows={d.unsubscribes} /> : null}
    </main>
  );
}

type Overview = NonNullable<ReturnType<typeof useOverview>["data"]>;

function CampaignsTab({ data }: { data: Overview }) {
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const qc = useQueryClient();
  const setStatus = useServerFn(setCampaignStatus);
  const del = useServerFn(deleteCampaign);
  const tick = useServerFn(runTickNow);

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: "running" | "paused" | "cancelled" }) => setStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Kampanija ištrinta");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
  const tickMut = useMutation({
    mutationFn: () => tick(),
    onSuccess: (r) => {
      toast.success(`Išsiųsta: ${r.sent}, klaidų: ${r.failed}${r.note ? ` — ${r.note}` : ""}`);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (creating) return <CampaignForm data={data} onClose={() => setCreating(false)} />;

  return (
    <section className="mt-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <button className={BTN} onClick={() => setCreating(true)}>
          Nauja kampanija
        </button>
        <button
          className={BTN_GHOST}
          disabled={!data.sesReady || tickMut.isPending}
          onClick={() => tickMut.mutate()}
          title="Sistema siunčia automatiškai kas minutę; šis mygtukas paleidžia ciklą iškart."
        >
          {tickMut.isPending ? "Siunčiama…" : "Siųsti kitą partiją dabar"}
        </button>
      </div>

      {data.campaigns.length === 0 ? (
        <div className={`${CARD} p-8 text-center text-sm text-ink-soft`}>Kampanijų dar nėra.</div>
      ) : null}

      {data.campaigns.map((c) => {
        const s = data.stats[c.id] ?? { total: 0, pending: 0, sent: 0, failed: 0, unsubscribed: 0 };
        const pct = s.total ? Math.round(((s.sent + s.failed + s.unsubscribed) / s.total) * 100) : 0;
        return (
          <article key={c.id} className={`${CARD} p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-ink">{c.name}</h2>
                <p className="mt-0.5 text-sm text-ink-soft">{c.subject}</p>
              </div>
              <Pill tone={c.status === "running" ? "accent" : c.status === "paused" ? "warn" : "muted"}>
                {STATUS_TEXT[c.status] ?? c.status}
              </Pill>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-cream" aria-label={`Progresas ${pct}%`}>
              <div className="h-full bg-teal-700" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              Gavėjų {s.total} · išsiųsta {s.sent} · laukia {s.pending} · klaidų {s.failed} · atsisakė {s.unsubscribed} ·
              limitas {c.daily_limit}/d., {c.per_minute}/min.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {c.status === "draft" || c.status === "paused" ? (
                <button className={BTN} onClick={() => statusMut.mutate({ id: c.id, status: "running" })}>
                  {c.status === "draft" ? "Pradėti siuntimą" : "Tęsti"}
                </button>
              ) : null}
              {c.status === "running" ? (
                <button className={BTN_GHOST} onClick={() => statusMut.mutate({ id: c.id, status: "paused" })}>
                  Pristabdyti
                </button>
              ) : null}
              {c.status === "running" || c.status === "paused" ? (
                <button
                  className={BTN_GHOST}
                  onClick={() => {
                    if (confirm("Nutraukti kampaniją? Likę laiškai nebus išsiųsti."))
                      statusMut.mutate({ id: c.id, status: "cancelled" });
                  }}
                >
                  Nutraukti
                </button>
              ) : null}
              <button className={BTN_GHOST} onClick={() => setOpenId(openId === c.id ? null : c.id)}>
                {openId === c.id ? "Slėpti gavėjus" : "Gavėjai"}
              </button>
              {["draft", "cancelled", "completed"].includes(c.status) ? (
                <button
                  className="rounded-full px-4 py-2.5 text-sm text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm("Ištrinti kampaniją visam laikui?")) delMut.mutate(c.id);
                  }}
                >
                  Ištrinti
                </button>
              ) : null}
            </div>
            {openId === c.id ? <RecipientsList id={c.id} senders={data.senders} /> : null}
          </article>
        );
      })}
    </section>
  );
}

function RecipientsList({ id, senders }: { id: string; senders: SenderRow[] }) {
  const fetch = useServerFn(listRecipients);
  const q = useQuery({ queryKey: ["recipients", id], queryFn: () => fetch({ data: { id } }) });
  const senderMap = new Map(senders.map((s) => [s.id, s.email]));
  if (q.isLoading) return <p className="mt-4 text-sm text-ink-soft">Kraunama…</p>;
  return (
    <div className="mt-4 max-h-96 overflow-auto rounded-2xl border border-ink/10">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-cream text-xs text-ink-soft uppercase">
          <tr>
            <th className="px-3 py-2">Gavėjas</th>
            <th className="px-3 py-2">Būsena</th>
            <th className="px-3 py-2">Siuntėjas</th>
            <th className="px-3 py-2">Laikas</th>
          </tr>
        </thead>
        <tbody>
          {(q.data?.recipients ?? []).map((r) => (
            <tr key={r.id} className="border-t border-ink/5">
              <td className="px-3 py-2">
                <div className="text-ink">{r.name ?? r.email}</div>
                <div className="text-xs text-ink-soft">{r.email}</div>
              </td>
              <td className="px-3 py-2" title={r.error ?? undefined}>
                {R_STATUS[r.status] ?? r.status}
                {r.error ? <div className="max-w-xs truncate text-xs text-red-700">{r.error}</div> : null}
              </td>
              <td className="px-3 py-2 text-xs text-ink-soft">{r.sender_id ? senderMap.get(r.sender_id) : "—"}</td>
              <td className="px-3 py-2 text-xs text-ink-soft">
                {r.sent_at ? new Date(r.sent_at).toLocaleString("lt-LT") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EMPTY_FILTERS: AudienceFilters = { statuses: [], countries: [], minUnits: null, maxUnits: null };

function CampaignForm({ data, onClose }: { data: Overview; onClose: () => void }) {
  const qc = useQueryClient();
  const fetchTemplates = useServerFn(listTemplates);
  const preview = useServerFn(previewAudience);
  const create = useServerFn(createCampaign);
  const test = useServerFn(sendTestEmail);
  const templates = useQuery({ queryKey: ["templates"], queryFn: () => fetchTemplates() });
  const emailTemplates = (templates.data?.templates ?? []).filter((t) => t.kind === "email" && t.is_active);

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [filters, setFilters] = useState<AudienceFilters>(EMPTY_FILTERS);
  const [dailyLimit, setDailyLimit] = useState(300);
  const [perMinute, setPerMinute] = useState(5);
  const [testTo, setTestTo] = useState("");

  const aud = useQuery({
    queryKey: ["audience", filters],
    queryFn: () => preview({ data: filters }),
  });

  useEffect(() => {
    const t = emailTemplates.find((x) => x.id === templateId);
    if (t) {
      setSubject(t.subject ?? "");
      setBody(t.body);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const totalSenderCap = useMemo(
    () => data.senders.filter((s) => s.is_active).reduce((a, s) => a + s.daily_limit, 0),
    [data.senders],
  );

  const createMut = useMutation({
    mutationFn: () =>
      create({
        data: {
          name,
          template_id: templateId || null,
          subject,
          body,
          filters,
          daily_limit: dailyLimit,
          per_minute: perMinute,
        },
      }),
    onSuccess: (r) => {
      toast.success(`Kampanija sukurta: ${r.recipients} gavėjų. Paspauskite „Pradėti siuntimą".`);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMut = useMutation({
    mutationFn: () => {
      const s = data.senders.find((x) => x.is_active);
      if (!s) throw new Error("Pirmiausia pridėkite aktyvų siuntėją");
      return test({ data: { sender_id: s.id, to: testTo, subject, body } });
    },
    onSuccess: () => toast.success("Testinis laiškas išsiųstas"),
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (key: "statuses" | "countries", v: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));

  const days = aud.data && dailyLimit ? Math.ceil(aud.data.count / Math.min(dailyLimit, totalSenderCap || dailyLimit)) : 0;
  const canSave = name.trim() && subject.trim() && body.trim() && (aud.data?.count ?? 0) > 0;

  return (
    <section className={`${CARD} mt-6 max-w-3xl space-y-6 p-6`}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-ink">Nauja kampanija</h2>
        <button className={BTN_GHOST} onClick={onClose}>
          Atšaukti
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-semibold text-ink-soft uppercase">1. Turinys</h3>
        <Field label="Kampanijos pavadinimas">
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} maxLength={150} />
        </Field>
        <Field label="Šablonas" hint="Pasirinkus šabloną, tema ir tekstas užpildomi automatiškai; galite koreguoti.">
          <select className={INPUT} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">— be šablono —</option>
            {emailTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tema">
          <input className={INPUT} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
        </Field>
        <Field
          label="Laiško tekstas"
          hint="Kintamieji: {{vardas}}, {{imone}}, {{miestas}}, {{salis}}, {{objektu_skaicius}}. Variacijos: {Sveiki|Laba diena}. Atsisakymo nuoroda pridedama automatiškai."
        >
          <textarea className={`${INPUT} min-h-56`} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-64 flex-1">
            <Field label="Testinis laiškas sau">
              <input
                type="email"
                autoComplete="email"
                className={INPUT}
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="jusu@pastas.lt"
              />
            </Field>
          </div>
          <button
            className={BTN_GHOST}
            disabled={!data.sesReady || !testTo || !subject || !body || testMut.isPending}
            onClick={() => testMut.mutate()}
          >
            {testMut.isPending ? "Siunčiama…" : "Siųsti testą"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-semibold text-ink-soft uppercase">2. Auditorija iš klientų registro</h3>
        <Field label="Būsena">
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((s) => (
              <Chip key={s} on={filters.statuses.includes(s)} onClick={() => toggle("statuses", s)}>
                {CLIENT_STATUS_LABELS[s] ?? s}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Šalis">
          <div className="flex flex-wrap gap-2">
            {data.countries.map((c) => (
              <Chip key={c} on={filters.countries.includes(c)} onClick={() => toggle("countries", c)}>
                {c}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Objektų nuo">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className={INPUT}
              value={filters.minUnits ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, minUnits: e.target.value === "" ? null : Number(e.target.value) }))}
            />
          </Field>
          <Field label="Objektų iki">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className={INPUT}
              value={filters.maxUnits ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, maxUnits: e.target.value === "" ? null : Number(e.target.value) }))}
            />
          </Field>
        </div>
        <div className="rounded-2xl bg-cream px-4 py-3 text-sm text-ink">
          {aud.isFetching ? "Skaičiuojama…" : `Atrinkta gavėjų: ${aud.data?.count ?? 0}`}
          <span className="block text-xs text-ink-soft">
            Įtraukiami tik klientai su el. paštu; atsisakę ir pasikartojantys adresai praleidžiami.
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-semibold text-ink-soft uppercase">3. Siuntimo greitis</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Daugiausia per dieną">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={20000}
              className={INPUT}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <Field label="Daugiausia per minutę">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={30}
              className={INPUT}
              value={perMinute}
              onChange={(e) => setPerMinute(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
            />
          </Field>
        </div>
        <p className="text-xs text-ink-soft">
          Aktyvių siuntėjų bendras dienos limitas: {totalSenderCap}. {days ? `Numatoma trukmė: ~${days} d.` : ""}
          {totalSenderCap && dailyLimit > totalSenderCap
            ? " Dienos limitas didesnis nei siuntėjų talpa — faktiškai bus išsiunčiama mažiau."
            : ""}
        </p>
      </div>

      <button className={BTN} disabled={!canSave || createMut.isPending} onClick={() => createMut.mutate()}>
        {createMut.isPending ? "Kuriama…" : "Sukurti kampaniją"}
      </button>
    </section>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-9 rounded-full border px-3 text-xs ${on ? "border-teal-700 bg-teal-700 text-cream" : "border-ink/15 text-ink"}`}
    >
      {children}
    </button>
  );
}

const EMPTY_SENDER = { email: "", from_name: "Revoo", daily_limit: 40, is_active: true };

function SendersTab({ senders }: { senders: SenderRow[] }) {
  const qc = useQueryClient();
  const save = useServerFn(upsertSender);
  const del = useServerFn(deleteSender);
  const [form, setForm] = useState<typeof EMPTY_SENDER & { id?: string }>(EMPTY_SENDER);

  const saveMut = useMutation({
    mutationFn: (v: typeof form) => save({ data: v }),
    onSuccess: () => {
      toast.success("Siuntėjas išsaugotas");
      setForm(EMPTY_SENDER);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const total = senders.filter((s) => s.is_active).reduce((a, s) => a + s.daily_limit, 0);

  return (
    <section className="mt-6 space-y-4">
      <div className={`${CARD} p-5`}>
        <h2 className="font-display text-xl text-ink">{form.id ? "Redaguoti siuntėją" : "Pridėti siuntėją"}</h2>
        <p className="mt-1 text-xs text-ink-soft">
          Kiekvienas adresas turi būti patvirtintas Amazon SES. Šaltiems laiškams rekomenduojama 30–50 laiškų per dieną vienam adresui.
        </p>
        <div className="mt-4 space-y-3">
          <Field label="El. pašto adresas">
            <input
              type="email"
              autoComplete="off"
              className={INPUT}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="info@sub1.revoostay.com"
            />
          </Field>
          <Field label="Rodomas vardas">
            <input className={INPUT} value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} />
          </Field>
          <Field label="Dienos limitas">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              className={INPUT}
              value={form.daily_limit}
              onChange={(e) => setForm({ ...form, daily_limit: Math.max(1, Number(e.target.value) || 1) })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Aktyvus
          </label>
          <div className="flex gap-2">
            <button className={BTN} disabled={!form.email || saveMut.isPending} onClick={() => saveMut.mutate(form)}>
              Išsaugoti
            </button>
            {form.id ? (
              <button className={BTN_GHOST} onClick={() => setForm(EMPTY_SENDER)}>
                Atšaukti
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`${CARD} overflow-hidden`}>
        <div className="px-5 py-3 text-sm text-ink-soft">
          Aktyvių siuntėjų bendra dienos talpa: <strong className="text-ink">{total}</strong> laiškų
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-cream text-xs text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-2">Adresas</th>
              <th className="px-4 py-2">Šiandien</th>
              <th className="px-4 py-2">Būsena</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {senders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-soft">
                  Siuntėjų dar nėra.
                </td>
              </tr>
            ) : null}
            {senders.map((s) => {
              const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vilnius" }).format(new Date());
              const used = s.sent_day === today ? s.sent_today : 0;
              return (
                <tr key={s.id} className="border-t border-ink/5">
                  <td className="px-4 py-2">
                    <div className="text-ink">{s.email}</div>
                    <div className="text-xs text-ink-soft">{s.from_name}</div>
                  </td>
                  <td className="px-4 py-2">
                    {used} / {s.daily_limit}
                  </td>
                  <td className="px-4 py-2">{s.is_active ? <Pill tone="accent">Aktyvus</Pill> : <Pill>Išjungtas</Pill>}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      className="px-2 py-1 text-teal-700 underline"
                      onClick={() =>
                        setForm({ id: s.id, email: s.email, from_name: s.from_name, daily_limit: s.daily_limit, is_active: s.is_active })
                      }
                    >
                      Redaguoti
                    </button>
                    <button
                      className="px-2 py-1 text-red-700 underline"
                      onClick={() => {
                        if (confirm(`Ištrinti ${s.email}?`)) delMut.mutate(s.id);
                      }}
                    >
                      Ištrinti
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UnsubsTab({ rows }: { rows: { email: string; reason: string; created_at: string }[] }) {
  const qc = useQueryClient();
  const remove = useServerFn(removeUnsubscribe);
  const mut = useMutation({
    mutationFn: (email: string) => remove({ data: { email } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
  return (
    <section className={`${CARD} mt-6 overflow-hidden`}>
      <table className="w-full text-left text-sm">
        <thead className="bg-cream text-xs text-ink-soft uppercase">
          <tr>
            <th className="px-4 py-2">El. paštas</th>
            <th className="px-4 py-2">Data</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-ink-soft">
                Atsisakiusių dar nėra.
              </td>
            </tr>
          ) : null}
          {rows.map((r) => (
            <tr key={r.email} className="border-t border-ink/5">
              <td className="px-4 py-2 text-ink">{r.email}</td>
              <td className="px-4 py-2 text-ink-soft">{new Date(r.created_at).toLocaleDateString("lt-LT")}</td>
              <td className="px-4 py-2 text-right">
                <button
                  className="px-2 py-1 text-xs text-ink-soft underline"
                  onClick={() => {
                    if (confirm("Grąžinti šį adresą į siuntimą? Darykite tik jei asmuo pats paprašė.")) mut.mutate(r.email);
                  }}
                >
                  Grąžinti
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
