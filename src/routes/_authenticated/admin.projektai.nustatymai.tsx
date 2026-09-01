import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { CURRENCIES, getSettings, saveSettings } from "@/lib/clients.functions";
import { BTN, CARD, Field, INPUT } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/projektai/nustatymai")({
  head: () => ({
    meta: [
      { title: "Modulio nustatymai — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const fetchSettings = useServerFn(getSettings);
  const persist = useServerFn(saveSettings);

  const query = useQuery({ queryKey: ["admin-settings"], queryFn: () => fetchSettings() });
  const settings = query.data?.settings ?? null;

  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState<string>("EUR");

  useEffect(() => {
    if (settings) {
      setCost(String(settings.default_hourly_internal_cost ?? 0));
      setCurrency(settings.base_currency);
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      persist({
        data: {
          id: settings!.id,
          default_hourly_internal_cost: cost,
          base_currency: currency as (typeof CURRENCIES)[number],
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Nustatymai išsaugoti");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });

  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/admin/projektai/"
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Į klientų sąrašą
        </Link>
        <h1 className="mt-3 font-display text-4xl text-ink">Modulio nustatymai</h1>

        {query.isLoading || !settings ? (
          <div className={`${CARD} mt-6 flex items-center gap-2 p-6 text-sm text-ink-soft`}>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Kraunama…
          </div>
        ) : (
          <form
            className={`${CARD} mt-6 grid gap-4 p-6 sm:grid-cols-2`}
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <Field
              label="Numatytoji vidinė valandos savikaina"
              hint="Naudojama, kai laiko įraše savikaina nenurodyta."
            >
              <input
                className={INPUT}
                inputMode="decimal"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </Field>
            <Field label="Bazinė valiuta" hint="Savikaina visada išreiškiama šia valiuta.">
              <select
                className={INPUT}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <button type="submit" className={BTN} disabled={save.isPending}>
                {save.isPending ? "Saugoma…" : "Išsaugoti"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
