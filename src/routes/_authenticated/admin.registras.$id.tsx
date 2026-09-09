import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  ACTIVITY_TYPES,
  ALL_STATUSES,
  addActivity,
  deleteActivity,
  getRegistryClient,
  listTeam,
  saveRegistryClient,
  type ActivityRow,
} from "@/lib/registry.functions";
import {
  ACTIVITY_TYPE_LABELS,
  CLIENT_FIELD_LABELS,
  CLIENT_STATUS_LABELS,
  formatDate,
} from "@/lib/admin-format";
import { listTemplates, type TemplateWithStats } from "@/lib/templates.functions";
import { BTN, BTN_GHOST, CARD, Field, INPUT, Pill } from "@/components/admin/ui";

type ClientVars = {
  name: string;
  contact_name: string | null;
  city: string | null;
  property_type: string | null;
  units_count: number | null;
  website_url: string | null;
};

function applyVariables(text: string, client: ClientVars | null, myName: string) {
  const first = (client?.name ?? "").trim().split(/\s+/)[0] ?? "";
  const map: Record<string, string> = {
    vardas: (client?.contact_name ?? "").trim() || first,
    objektas: client?.name ?? "",
    miestas: client?.city ?? "",
    tipas: client?.property_type ?? "",
    vienetai: client?.units_count != null ? String(client.units_count) : "",
    svetaine: client?.website_url ?? "",
    mano_vardas: myName,
  };
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (full, key: string) =>
    key in map ? (map[key] ?? "") : full,
  );
}

export const Route = createFileRoute("/_authenticated/admin/registras/$id")({
  head: () => ({
    meta: [
      { title: "Objekto kortelė — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: RegistryClientPage,
});

type FormState = {
  name: string;
  units_count: string;
  building_area_sqm: string;
  developer: string;
  city: string;
  country: string;
  property_type: string;
  website_url: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  status: string;
  next_action: string;
  next_action_date: string;
  assigned_to: string;
};

const EMPTY: FormState = {
  name: "",
  units_count: "",
  building_area_sqm: "",
  developer: "",
  city: "",
  country: "",
  property_type: "",
  website_url: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  notes: "",
  status: "lead",
  next_action: "",
  next_action_date: "",
  assigned_to: "",
};

function RegistryClientPage() {
  const { id } = useParams({ from: "/_authenticated/admin/registras/$id" });
  const isNew = id === "naujas";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchClient = useServerFn(getRegistryClient);
  const save = useServerFn(saveRegistryClient);
  const addAct = useServerFn(addActivity);
  const delAct = useServerFn(deleteActivity);

  const query = useQuery({
    queryKey: ["registry-client", id],
    queryFn: () => fetchClient({ data: { id } }),
    enabled: !isNew,
  });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [filter, setFilter] = useState<"all" | "manual" | "system">("all");

  useEffect(() => {
    const c = query.data?.client;
    if (!c) return;
    setForm({
      name: c.name ?? "",
      units_count: c.units_count?.toString() ?? "",
      building_area_sqm: c.building_area_sqm?.toString() ?? "",
      developer: c.developer ?? "",
      city: c.city ?? "",
      country: c.country ?? "",
      property_type: c.property_type ?? "",
      website_url: c.website_url ?? "",
      contact_name: c.contact_name ?? "",
      contact_email: c.contact_email ?? "",
      contact_phone: c.contact_phone ?? "",
      notes: c.notes ?? "",
      status: c.status,
      next_action: c.next_action ?? "",
      next_action_date: c.next_action_date ?? "",
      assigned_to: c.assigned_to ?? "",
    });
  }, [query.data?.client]);

  const fetchTeam = useServerFn(listTeam);
  const teamQuery = useQuery({
    queryKey: ["registry-team"],
    queryFn: () => fetchTeam({}),
    enabled: isNew,
  });

  const team = query.data?.team ?? teamQuery.data?.team ?? [];
  const nameOf = (uid: string | null) => {
    const t = team.find((p) => p.id === uid);
    return t?.full_name ?? t?.email ?? (uid ? "Nežinomas naudotojas" : "Sistema");
  };

  const fetchTemplates = useServerFn(listTemplates);
  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => fetchTemplates(),
    enabled: !isNew,
  });
  const templates = (templatesQuery.data?.templates ?? []).filter((t) => t.is_active);
  const templateNameOf = (tid: string | null) =>
    (templatesQuery.data?.templates ?? []).find((t) => t.id === tid)?.name ?? null;
  const myName = query.data?.me ? nameOf(query.data.me) : "";

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...(isNew ? {} : { id }),
          name: form.name,
          units_count: form.units_count || null,
          building_area_sqm: form.building_area_sqm || null,
          developer: form.developer || null,
          city: form.city || null,
          country: form.country || null,
          property_type: form.property_type || null,
          website_url: form.website_url || null,
          contact_name: form.contact_name || null,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
          notes: form.notes || null,
          status: form.status as (typeof ALL_STATUSES)[number],
          next_action: form.next_action || null,
          next_action_date: form.next_action_date || null,
          assigned_to: form.assigned_to || null,
        },
      }),
    onSuccess: async (res) => {
      toast.success("Išsaugota");
      await queryClient.invalidateQueries({ queryKey: ["registry"] });
      if (isNew) {
        await navigate({ to: "/admin/registras/$id/", params: { id: res.id } });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["registry-client", id] });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activities = query.data?.activities ?? [];
  const visible = useMemo(
    () => activities.filter((a) => (filter === "all" ? true : a.kind === filter)),
    [activities, filter],
  );

  if (!isNew && query.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-2 text-sm text-ink-soft">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Kraunama…
      </main>
    );
  }

  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/admin/registras/"
          search={(prev) => prev}
          className="flex items-center gap-2 text-sm text-ink-soft"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Į registrą
        </Link>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-4xl text-ink">
            {isNew ? "Naujas objektas" : query.data?.client.name}
          </h1>
          <div className="flex items-center gap-2">
            {!isNew ? <Pill>{CLIENT_STATUS_LABELS[form.status]}</Pill> : null}
            <button
              type="button"
              className={BTN}
              disabled={saveMutation.isPending || form.name.trim().length === 0}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Saugoma…" : "Išsaugoti"}
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className={`${CARD} space-y-4 p-6`}>
            <h2 className="font-display text-xl text-ink">Objekto duomenys</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pavadinimas">
                <input
                  className={INPUT}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Būsena">
                <select
                  className={INPUT}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {CLIENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Kambarių skaičius">
                <input
                  className={INPUT}
                  inputMode="numeric"
                  value={form.units_count}
                  onChange={(e) => setForm({ ...form, units_count: e.target.value })}
                />
              </Field>
              <Field label="Pastato plotas (m²)">
                <input
                  className={INPUT}
                  inputMode="decimal"
                  value={form.building_area_sqm}
                  onChange={(e) => setForm({ ...form, building_area_sqm: e.target.value })}
                />
              </Field>
              <Field label="Statytojas / vystytojas">
                <input
                  className={INPUT}
                  value={form.developer}
                  onChange={(e) => setForm({ ...form, developer: e.target.value })}
                />
              </Field>
              <Field label="Tipas">
                <input
                  className={INPUT}
                  value={form.property_type}
                  onChange={(e) => setForm({ ...form, property_type: e.target.value })}
                />
              </Field>
              <Field label="Miestas">
                <input
                  className={INPUT}
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </Field>
              <Field label="Šalis">
                <input
                  className={INPUT}
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </Field>
              <Field label="Svetainė">
                <input
                  className={INPUT}
                  value={form.website_url}
                  onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                />
              </Field>
              <Field label="Kontaktinis asmuo (objekte)">
                <input
                  className={INPUT}
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                />
              </Field>
              <Field label="Kontaktinis el. paštas">
                <input
                  className={INPUT}
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                />
              </Field>
              <Field label="Telefonas">
                <input
                  className={INPUT}
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Pastaba">
              <textarea
                className={`${INPUT} min-h-28`}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Kitas veiksmas">
                <input
                  className={INPUT}
                  value={form.next_action}
                  onChange={(e) => setForm({ ...form, next_action: e.target.value })}
                />
              </Field>
              <Field label="Kito veiksmo data">
                <input
                  type="date"
                  className={INPUT}
                  value={form.next_action_date}
                  onChange={(e) => setForm({ ...form, next_action_date: e.target.value })}
                />
              </Field>
              <Field label="Atsakingas (mūsų komanda)">
                <select
                  className={INPUT}
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                >
                  <option value="">—</option>
                  {team.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name ?? t.email}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className={`${CARD} p-6`}>
            <h2 className="font-display text-xl text-ink">Veiksmų istorija</h2>
            {isNew ? (
              <p className="mt-3 text-sm text-ink-soft">
                Istorija atsiras, kai objektas bus išsaugotas.
              </p>
            ) : (
              <>
                <ActivityForm
                  templates={templates}
                  fill={(text) =>
                    applyVariables(text, query.data?.client ?? null, myName)
                  }
                  onSubmit={async (payload) => {
                    await addAct({ data: { client_id: id, ...payload } });
                    await queryClient.invalidateQueries({ queryKey: ["registry-client", id] });
                    toast.success("Veiksmas įrašytas");
                  }}
                />

                <div className="mt-5 flex gap-2">
                  {(
                    [
                      ["all", "Viskas"],
                      ["manual", "Tik veiksmai"],
                      ["system", "Tik pakeitimai"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(key)}
                      className={`rounded-full px-3 py-1 text-xs transition-colors ${
                        filter === key ? "bg-teal-700 text-cream" : "bg-cream text-ink-soft"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <ol className="mt-5 space-y-4">
                  {visible.length === 0 ? (
                    <li className="text-sm text-ink-soft">Įrašų dar nėra.</li>
                  ) : (
                    visible.map((a) => (
                      <li key={a.id} className="border-l-2 border-ink/10 pl-4">
                        <p className="text-xs text-ink-soft">
                          {formatDate(a.occurred_at, true)} · {nameOf(a.author_id)}
                        </p>
                        <p className="mt-1 text-sm text-ink">{describe(a, nameOf)}</p>
                        {a.template_id && templateNameOf(a.template_id) ? (
                          <span className="mt-1 inline-block rounded-full bg-cream px-2 py-0.5 text-xs text-ink-soft">
                            Šablonas: {templateNameOf(a.template_id)}
                          </span>
                        ) : null}
                        {a.kind === "manual" ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await delAct({ data: { id: a.id } });
                              await queryClient.invalidateQueries({
                                queryKey: ["registry-client", id],
                              });
                            }}
                            className="mt-1 flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" /> Trinti
                          </button>
                        ) : null}
                      </li>
                    ))
                  )}
                </ol>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function describe(a: ActivityRow, nameOf: (id: string | null) => string) {
  if (a.kind === "manual") {
    const type = a.activity_type ? ACTIVITY_TYPE_LABELS[a.activity_type] : "Pastaba";
    return `${type}: ${a.body ?? ""}`;
  }
  if (a.field === "created") return `Objektas sukurtas: ${a.new_value ?? ""}`;

  const label = CLIENT_FIELD_LABELS[a.field ?? ""] ?? a.field ?? "Laukas";
  const render = (v: string | null) => {
    if (!v) return "—";
    if (a.field === "status") return CLIENT_STATUS_LABELS[v] ?? v;
    if (a.field === "assigned_to") return nameOf(v);
    return v;
  };
  return `${label}: ${render(a.old_value)} → ${render(a.new_value)}`;
}

function ActivityForm({
  templates,
  fill,
  onSubmit,
}: {
  templates: TemplateWithStats[];
  fill: (text: string) => string;
  onSubmit: (payload: {
    activity_type: (typeof ACTIVITY_TYPES)[number];
    body: string;
    occurred_at: string;
    template_id: string | null;
  }) => Promise<void>;
}) {
  const [type, setType] = useState<(typeof ACTIVITY_TYPES)[number]>("call");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [templateId, setTemplateId] = useState("");

  const templateKind = type === "call" ? "call" : type === "email" || type === "proposal" ? "email" : null;
  const options = templates.filter((t) => t.kind === templateKind);

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    if (!id) return;
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    if (body.trim().length > 0 && !window.confirm("Perrašyti esamą tekstą šablono tekstu?")) return;
    const subject = t.subject ? `Tema: ${fill(t.subject)}\n\n` : "";
    setBody(subject + fill(t.body));
  };

  return (
    <div className="mt-4 space-y-3 rounded-2xl bg-cream/70 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipas">
          <select
            className={INPUT}
            value={type}
            onChange={(e) => {
              setType(e.target.value as (typeof ACTIVITY_TYPES)[number]);
              setTemplateId("");
            }}
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACTIVITY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data">
          <input
            type="date"
            className={INPUT}
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </Field>
      </div>
      {templateKind ? (
        <Field label="Šablonas">
          <select
            className={INPUT}
            value={templateId}
            onChange={(e) => pickTemplate(e.target.value)}
          >
            <option value="">— be šablono —</option>
            {options.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field label="Aprašymas">
        <textarea
          className={`${INPUT} min-h-20`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      <button
        type="button"
        className={BTN_GHOST}
        disabled={busy || body.trim().length === 0}
        onClick={async () => {
          setBusy(true);
          try {
            await onSubmit({
              activity_type: type,
              body: body.trim(),
              occurred_at: when,
              template_id: templateId || null,
            });
            setBody("");
            setTemplateId("");
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Įrašoma…" : "Įrašyti veiksmą"}
      </button>
    </div>
  );
}
