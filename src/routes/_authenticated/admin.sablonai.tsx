import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  deleteTemplate,
  listTemplates,
  upsertTemplate,
  type TemplateKind,
  type TemplateWithStats,
} from "@/lib/templates.functions";
import { BTN, BTN_GHOST, CARD, Field, INPUT, Pill } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/sablonai")({
  head: () => ({
    meta: [
      { title: "Šablonai — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: TemplatesPage,
});

type Mode =
  | { view: "list" }
  | { view: "preview"; id: string }
  | { view: "edit"; id: string | null };

const EMPTY_FORM = { name: "", subject: "", body: "", is_active: true };

const formatDay = (value: string | null) => (value ? value.slice(0, 10) : "—");

function TemplatesPage() {
  const queryClient = useQueryClient();
  const fetchTemplates = useServerFn(listTemplates);
  const save = useServerFn(upsertTemplate);
  const remove = useServerFn(deleteTemplate);

  const [tab, setTab] = useState<TemplateKind>("email");
  const [mode, setMode] = useState<Mode>({ view: "list" });
  const [form, setForm] = useState(EMPTY_FORM);

  const query = useQuery({ queryKey: ["templates"], queryFn: () => fetchTemplates() });
  const all = query.data?.templates ?? [];

  const rows = useMemo(() => all.filter((t) => t.kind === tab), [all, tab]);
  const current =
    mode.view === "list" || mode.id === null ? null : (all.find((t) => t.id === mode.id) ?? null);

  const openEdit = (t: TemplateWithStats | null) => {
    setForm(
      t
        ? { name: t.name, subject: t.subject ?? "", body: t.body, is_active: t.is_active }
        : EMPTY_FORM,
    );
    setMode({ view: "edit", id: t?.id ?? null });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...(mode.view === "edit" && mode.id ? { id: mode.id } : {}),
          kind: tab,
          name: form.name,
          subject: form.subject || null,
          body: form.body,
          is_active: form.is_active,
        },
      }),
    onSuccess: async (res) => {
      toast.success("Išsaugota");
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      setMode({ view: "preview", id: res.id });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Šablonas ištrintas");
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      setMode({ view: "list" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-ink">Šablonai</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Laiškų šablonai ir skambučių skriptai. Sistema laiškų nesiunčia — tekstą naudojate
              patys, o registre pasižymite, kurį šabloną panaudojote.
            </p>
          </div>
          {mode.view === "list" ? (
            <button type="button" className={BTN} onClick={() => openEdit(null)}>
              Naujas šablonas
            </button>
          ) : (
            <button type="button" className={BTN_GHOST} onClick={() => setMode({ view: "list" })}>
              Į sąrašą
            </button>
          )}
        </header>

        <div className="mt-6 flex gap-2">
          {(
            [
              ["email", "Laiškų šablonai"],
              ["call", "Skambučių skriptai"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setMode({ view: "list" });
              }}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                tab === key ? "bg-teal-700 text-cream" : "bg-white text-ink-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {query.isLoading ? (
          <p className="mt-8 text-sm text-ink-soft">Kraunama…</p>
        ) : mode.view === "list" ? (
          <section className={`${CARD} mt-6 overflow-x-auto`}>
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs tracking-wide text-ink-soft uppercase">
                  <th className="px-5 py-3">Pavadinimas</th>
                  {tab === "email" ? <th className="px-5 py-3">Tema</th> : null}
                  <th className="px-5 py-3">Panaudota</th>
                  <th className="px-5 py-3">Paskutinį kartą</th>
                  <th className="px-5 py-3">Aktyvus</th>
                  <th className="px-5 py-3">Veiksmai</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-ink-soft">
                      Šablonų dar nėra.
                    </td>
                  </tr>
                ) : (
                  rows.map((t) => (
                    <tr
                      key={t.id}
                      className={`border-b border-ink/5 last:border-0 ${
                        t.is_active ? "" : "text-ink-soft/70"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          className="text-left text-ink hover:underline"
                          onClick={() => setMode({ view: "preview", id: t.id })}
                        >
                          {t.name}
                        </button>
                      </td>
                      {tab === "email" ? (
                        <td className="px-5 py-3 text-ink-soft">{t.subject ?? "—"}</td>
                      ) : null}
                      <td className="px-5 py-3">
                        {t.usage_count > 0 ? (
                          t.usage_count
                        ) : (
                          <span className="text-ink-soft/60">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink-soft">{formatDay(t.last_used_at)}</td>
                      <td className="px-5 py-3">
                        {t.is_active ? <Pill tone="accent">Taip</Pill> : <Pill>Ne</Pill>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-3 text-xs">
                          <button
                            type="button"
                            className="text-teal-700 hover:underline"
                            onClick={() => setMode({ view: "preview", id: t.id })}
                          >
                            Peržiūrėti
                          </button>
                          <button
                            type="button"
                            className="text-teal-700 hover:underline"
                            onClick={() => openEdit(t)}
                          >
                            Redaguoti
                          </button>
                          {t.usage_count === 0 ? (
                            <button
                              type="button"
                              className="text-ink-soft hover:text-ink"
                              onClick={() => {
                                if (
                                  window.confirm(`Ištrinti šabloną „${t.name}“? Veiksmo atšaukti negalėsite.`)
                                ) {
                                  deleteMutation.mutate(t.id);
                                }
                              }}
                            >
                              Trinti
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        ) : mode.view === "preview" && current ? (
          <section className={`${CARD} mt-6 space-y-4 p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-ink">{current.name}</h2>
                {current.subject ? (
                  <p className="mt-1 text-sm text-ink-soft">Tema: {current.subject}</p>
                ) : null}
                <p className="mt-1 text-xs text-ink-soft">
                  Panaudota: {current.usage_count > 0 ? current.usage_count : "—"} · Paskutinį kartą:{" "}
                  {formatDay(current.last_used_at)}
                </p>
              </div>
              <button type="button" className={BTN} onClick={() => openEdit(current)}>
                Redaguoti
              </button>
            </div>
            <p className="rounded-2xl bg-cream/70 p-4 text-sm whitespace-pre-wrap text-ink">
              {current.body}
            </p>
          </section>
        ) : mode.view === "edit" ? (
          <section className={`${CARD} mt-6 space-y-4 p-6`}>
            <h2 className="font-display text-2xl text-ink">
              {mode.id ? "Šablono redagavimas" : "Naujas šablonas"}
            </h2>
            <Field label="Pavadinimas">
              <input
                className={INPUT}
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            {tab === "email" ? (
              <Field label="Tema">
                <input
                  className={INPUT}
                  maxLength={200}
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </Field>
            ) : null}
            <Field label={tab === "email" ? "Tekstas" : "Skriptas"}>
              <textarea
                className={`${INPUT} min-h-80 font-mono`}
                maxLength={8000}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </Field>
            <p className="text-xs text-ink-soft">
              Kintamieji: {"{{vardas}}"} · {"{{objektas}}"} · {"{{miestas}}"} · {"{{tipas}}"} ·{" "}
              {"{{vienetai}}"} · {"{{svetaine}}"} · {"{{mano_vardas}}"} — jie pakeičiami kliento
              duomenimis, kai šabloną pasirenkate kliento kortelėje.
            </p>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Aktyvus (rodomas kliento kortelėje)
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                className={BTN}
                disabled={
                  saveMutation.isPending ||
                  form.name.trim().length === 0 ||
                  form.body.trim().length === 0
                }
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Saugoma…" : "Išsaugoti"}
              </button>
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() =>
                  mode.view === "edit" && mode.id
                    ? setMode({ view: "preview", id: mode.id })
                    : setMode({ view: "list" })
                }
              >
                Atšaukti
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
