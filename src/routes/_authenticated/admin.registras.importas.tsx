import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { importClientsCsv, type ImportRow } from "@/lib/registry.functions";
import { BTN, BTN_GHOST, CARD, Field, INPUT } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/registras/importas")({
  head: () => ({
    meta: [
      { title: "CSV importas — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: ImportPage,
});

const TARGETS: { key: keyof ImportRow; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Pavadinimas" },
  { key: "units_count", label: "Kambarių skaičius", numeric: true },
  { key: "building_area_sqm", label: "Pastato plotas", numeric: true },
  { key: "developer", label: "Statytojas" },
  { key: "city", label: "Miestas" },
  { key: "country", label: "Šalis" },
  { key: "property_type", label: "Tipas" },
  { key: "website_url", label: "Svetainė" },
  { key: "contact_name", label: "Kontaktinis asmuo" },
  { key: "contact_email", label: "El. paštas" },
  { key: "contact_phone", label: "Telefonas" },
  { key: "notes", label: "Pastaba" },
];

/** Paprastas CSV skaitytuvas su kabučių ir kabliataškio/kablelio palaikymu. */
function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const delimiter = (clean.split("\n")[0] ?? "").includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim().length > 0));
}

/** "~50", "50 kambarių", "nežinoma" → 50 / 50 / null */
function toNumber(raw: string): number | null {
  const match = raw.replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function ImportPage() {
  const run = useServerFn(importClientsCsv);
  const queryClient = useQueryClient();

  const [headers, setHeaders] = useState<string[]>([]);
  const [body, setBody] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
    errorCount: number;
  } | null>(null);

  const onFile = async (file: File) => {
    const rows = parseCsv(await file.text());
    if (rows.length < 2) {
      toast.error("Faile nerasta duomenų eilučių");
      return;
    }
    const head = (rows[0] ?? []).map((h) => h.trim());
    setHeaders(head);
    setBody(rows.slice(1));
    setResult(null);

    // Automatinis spėjimas pagal stulpelio pavadinimą.
    const guess: Record<string, string> = {};
    for (const t of TARGETS) {
      const hit = head.find((h) => h.toLowerCase().includes(t.label.toLowerCase().slice(0, 5)));
      if (hit) guess[t.key] = hit;
    }
    setMapping(guess);
  };

  const buildRows = (): ImportRow[] => {
    const idx = (target: string) => headers.indexOf(mapping[target] ?? "");
    const out: ImportRow[] = [];
    for (const r of body) {
      const nameIdx = idx("name");
      const name = nameIdx >= 0 ? (r[nameIdx] ?? "").trim() : "";
      if (!name) continue;
      const row: ImportRow = { name };
      for (const t of TARGETS) {
        if (t.key === "name") continue;
        const i = idx(t.key);
        if (i < 0) continue;
        const raw = (r[i] ?? "").trim();
        if (!raw) continue;
        if (t.numeric) {
          const n = toNumber(raw);
          if (n !== null) (row as Record<string, unknown>)[t.key] = n;
        } else {
          (row as Record<string, unknown>)[t.key] = raw;
        }
      }
      out.push(row);
    }
    return out;
  };

  const submit = async () => {
    const rows = buildRows();
    if (rows.length === 0) {
      toast.error("Nėra eilučių su pavadinimu — priskirkite stulpelį „Pavadinimas“");
      return;
    }
    setBusy(true);
    try {
      const res = await run({ data: { rows } });
      setResult(res);
      await queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.success(`Sukurta: ${res.created}, praleista: ${res.skipped}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link to="/admin/registras/" className="flex items-center gap-2 text-sm text-ink-soft">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Į registrą
        </Link>
        <h1 className="mt-4 font-display text-4xl text-ink">CSV importas</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Įkelkite failą, priskirkite stulpelius ir importuokite. Jau esantys objektai (pagal
          svetainę, el. paštą arba pavadinimą su miestu) praleidžiami.
        </p>

        <div className={`${CARD} mt-6 p-6`}>
          <Field label="CSV failas">
            <input
              type="file"
              accept=".csv,text/csv"
              className={INPUT}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
          </Field>

          {headers.length > 0 ? (
            <>
              <p className="mt-6 text-sm text-ink-soft">Rasta eilučių: {body.length}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {TARGETS.map((t) => (
                  <Field key={t.key} label={t.label}>
                    <select
                      className={INPUT}
                      value={mapping[t.key] ?? ""}
                      onChange={(e) => setMapping({ ...mapping, [t.key]: e.target.value })}
                    >
                      <option value="">— nenaudojama —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>

              <div className="mt-6 flex gap-2">
                <button type="button" className={BTN} disabled={busy} onClick={submit}>
                  {busy ? "Importuojama…" : "Importuoti"}
                </button>
                <button
                  type="button"
                  className={BTN_GHOST}
                  onClick={() => {
                    setHeaders([]);
                    setBody([]);
                    setMapping({});
                    setResult(null);
                  }}
                >
                  Išvalyti
                </button>
              </div>
            </>
          ) : null}

          {result ? (
            <div className="mt-6 rounded-2xl bg-cream/70 p-4 text-sm text-ink">
              <p>Sukurta objektų: {result.created}</p>
              <p>Praleista kaip dublikatai: {result.skipped}</p>
              {result.errorCount > 0 ? (
                <>
                  <p className="mt-2">Klaidų: {result.errorCount}</p>
                  <ul className="mt-1 list-disc pl-5 text-ink-soft">
                    {result.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
