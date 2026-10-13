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
      { title: "El. paštų importas — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: ImportPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readRows(file: File): Promise<string[][]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = /\.csv$/i.test(file.name)
    ? XLSX.read(new TextDecoder().decode(buf).replace(/^\uFEFF/, ""), { type: "string" })
    : XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });
}

function ImportPage() {
  const run = useServerFn(importClientsCsv);
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [invalid, setInvalid] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
    errorCount: number;
  } | null>(null);

  const onFile = async (file: File) => {
    try {
      const raw = await readRows(file);
      const out: ImportRow[] = [];
      const seen = new Set<string>();
      let bad = 0;
      for (const r of raw) {
        const email = String(r[0] ?? "").trim().toLowerCase();
        const country = String(r[1] ?? "").trim();
        if (!email) continue;
        if (!EMAIL_RE.test(email)) {
          if (!/e-?mail|paštas/i.test(email)) bad += 1;
          continue;
        }
        if (seen.has(email)) continue;
        seen.add(email);
        out.push({ name: email, contact_email: email, country: country || null });
      }
      setRows(out);
      setInvalid(bad);
      setResult(null);
      if (out.length === 0) toast.error("Faile nerasta tinkamų el. pašto adresų");
    } catch {
      toast.error("Nepavyko perskaityti failo. Įkelkite .xlsx, .xls arba .csv");
    }
  };

  const submit = async () => {
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
      <div className="mx-auto max-w-3xl">
        <Link to="/admin/registras/" className="flex items-center gap-2 text-sm text-ink-soft">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Į registrą
        </Link>
        <h1 className="mt-4 font-display text-4xl text-ink">El. paštų importas</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Įkelkite Excel arba CSV failą su dviem stulpeliais: pirmas — el. paštas, antras — šalis.
          Visi nauji klientai gauna statusą „Naujas“. Jau esantys adresai praleidžiami.
        </p>

        <div className={`${CARD} mt-6 p-6`}>
          <Field label="Failas (.xlsx, .xls, .csv)">
            <input
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className={INPUT}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
          </Field>

          {rows.length > 0 ? (
            <>
              <p className="mt-6 text-sm text-ink">
                Rasta tinkamų adresų: <strong>{rows.length}</strong>
                {invalid > 0 ? ` · netinkamų praleista: ${invalid}` : ""}
              </p>
              <ul className="mt-3 max-h-48 overflow-y-auto rounded-2xl bg-cream/60 p-3 text-xs text-ink-soft">
                {rows.slice(0, 50).map((r) => (
                  <li key={r.contact_email}>
                    {r.contact_email}
                    {r.country ? ` — ${r.country}` : ""}
                  </li>
                ))}
                {rows.length > 50 ? <li>… ir dar {rows.length - 50}</li> : null}
              </ul>
              <div className="mt-6 flex gap-2">
                <button type="button" className={BTN} disabled={busy} onClick={submit}>
                  {busy ? "Importuojama…" : `Importuoti ${rows.length}`}
                </button>
                <button
                  type="button"
                  className={BTN_GHOST}
                  onClick={() => {
                    setRows([]);
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
              <p>Sukurta klientų: {result.created}</p>
              <p>Praleista (jau yra registre): {result.skipped}</p>
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
