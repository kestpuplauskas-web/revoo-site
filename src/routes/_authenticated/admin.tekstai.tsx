import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { copy } from "@/content/copy";
import { SECTION_LABELS, SECTION_ORDER, flattenCopy } from "@/content/copy-paths";
import {
  adminListCopy,
  resetCopyValue,
  saveCopyValue,
} from "@/lib/homepage-copy.functions";
import type { Lang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/tekstai")({
  component: TextsPage,
});

function TextsPage() {
  const [lang, setLang] = useState<Lang>("lt");
  const [open, setOpen] = useState<string | null>("hero");
  const queryClient = useQueryClient();

  const list = useServerFn(adminListCopy);
  const save = useServerFn(saveCopyValue);
  const reset = useServerFn(resetCopyValue);

  const overrides = useQuery({
    queryKey: ["homepage-copy", lang],
    queryFn: () => list({ data: { lang } }),
  });

  const sections = useMemo(() => {
    const all = flattenCopy(copy[lang]);
    const grouped: Record<string, { path: string; value: string }[]> = {};
    for (const entry of all) {
      const root = entry.path.split(".")[0] ?? "";
      if (!(root in SECTION_LABELS)) continue;
      const arr = grouped[root] ?? (grouped[root] = []);
      arr.push(entry);
    }
    return SECTION_ORDER.filter((key) => grouped[key]?.length).map((key) => ({
      key,
      label: SECTION_LABELS[key]!,
      entries: grouped[key]!,
    }));
  }, [lang]);

  const current = overrides.data?.overrides ?? {};

  const handleSave = async (path: string, value: string, original: string) => {
    try {
      if (value.trim() === original.trim()) {
        if (current[path] !== undefined) {
          await reset({ data: { lang, path } });
          toast.success("Grąžintas pradinis tekstas");
        } else {
          return;
        }
      } else {
        await save({ data: { lang, path, value } });
        toast.success("Išsaugota");
      }
      await queryClient.invalidateQueries({ queryKey: ["homepage-copy", lang] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko išsaugoti");
    }
  };

  const handleReset = async (path: string) => {
    try {
      await reset({ data: { lang, path } });
      await queryClient.invalidateQueries({ queryKey: ["homepage-copy", lang] });
      toast.success("Grąžintas pradinis tekstas");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko atstatyti");
    }
  };

  const changedCount = Object.keys(current).length;

  return (
    <main className="px-5 py-10 sm:px-8 lg:px-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-ink">Pagrindinio puslapio tekstai</h1>
        <p className="mt-2 max-w-[70ch] text-sm text-ink-soft">
          Anglų ir lietuvių tekstai yra visiškai nepriklausomi — pakeitimas vienoje kalboje
          kitos nekeičia. Pakeisti laukai svetainėje atsiranda iškart. Pakeista laukų:{" "}
          {changedCount}.
        </p>

        <div className="mt-5 inline-flex rounded-full border border-ink/15 p-1">
          {(["lt", "en"] as Lang[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={
                lang === code
                  ? "rounded-full bg-ink px-4 py-1.5 text-sm text-cream"
                  : "rounded-full px-4 py-1.5 text-sm text-ink-soft"
              }
            >
              {code === "lt" ? "Lietuvių" : "Anglų"}
            </button>
          ))}
        </div>
      </header>

      {overrides.isLoading ? (
        <p className="text-sm text-ink-soft">Kraunama…</p>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => {
            const isOpen = open === section.key;
            const sectionChanged = section.entries.filter(
              (e) => current[e.path] !== undefined,
            ).length;
            return (
              <section
                key={section.key}
                className="overflow-hidden rounded-2xl border border-ink/10 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : section.key)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-medium text-ink">{section.label}</span>
                  <span className="text-xs text-ink-soft">
                    {sectionChanged > 0 ? `${sectionChanged} pakeista · ` : ""}
                    {section.entries.length} laukai
                  </span>
                </button>

                {isOpen ? (
                  <div className="space-y-5 border-t border-ink/10 px-5 py-5">
                    {section.entries.map((entry) => (
                      <CopyField
                        key={entry.path}
                        path={entry.path}
                        original={entry.value}
                        override={current[entry.path]}
                        onSave={handleSave}
                        onReset={handleReset}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function CopyField({
  path,
  original,
  override,
  onSave,
  onReset,
}: {
  path: string;
  original: string;
  override: string | undefined;
  onSave: (path: string, value: string, original: string) => Promise<void>;
  onReset: (path: string) => Promise<void>;
}) {
  const [value, setValue] = useState(override ?? original);
  const [busy, setBusy] = useState(false);
  const dirty = value !== (override ?? original);
  const long = original.length > 90;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={`f-${path}`} className="text-xs text-ink-soft">
          {path}
        </label>
        {override !== undefined ? (
          <span className="rounded-full bg-amber-light/40 px-2 py-0.5 text-[11px] text-ink">
            pakeista
          </span>
        ) : null}
      </div>

      {long ? (
        <textarea
          id={`f-${path}`}
          value={value}
          rows={Math.min(8, Math.ceil(value.length / 80) + 1)}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink"
        />
      ) : (
        <input
          id={`f-${path}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink"
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={async () => {
            setBusy(true);
            await onSave(path, value, original);
            setBusy(false);
          }}
          className="rounded-full bg-ink px-4 py-1.5 text-xs text-cream disabled:opacity-40"
        >
          Išsaugoti
        </button>
        {override !== undefined ? (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onReset(path);
              setValue(original);
              setBusy(false);
            }}
            className="text-xs text-ink-soft underline"
          >
            Grąžinti pradinį
          </button>
        ) : null}
        {dirty ? <span className="text-xs text-ink-soft">neišsaugota</span> : null}
      </div>
    </div>
  );
}
