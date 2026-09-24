import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BTN, BTN_GHOST, CARD, Field, INPUT } from "@/components/admin/ui";
import {
  adminGetPricing,
  copyTiers,
  deleteTier,
  saveSettings,
  saveTier,
} from "@/lib/pricing.functions";
import { calculatePrice, formatPrice, type PricingTier, type RentalKind } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/kainodara")({
  component: PricingAdminPage,
});

const KIND_LABEL: Record<RentalKind, string> = {
  short_term: "Trumpalaikė nuoma",
  long_term: "Ilgalaikė nuoma",
};

function PricingAdminPage() {
  const queryClient = useQueryClient();
  const load = useServerFn(adminGetPricing);
  const upsertTier = useServerFn(saveTier);
  const removeTier = useServerFn(deleteTier);
  const persistSettings = useServerFn(saveSettings);
  const duplicate = useServerFn(copyTiers);

  const [kind, setKind] = useState<RentalKind>("short_term");
  const [preview, setPreview] = useState(36);

  const pricing = useQuery({ queryKey: ["admin-pricing"], queryFn: () => load() });
  const data = pricing.data;

  const tiers = useMemo(
    () =>
      (data?.tiers ?? [])
        .filter((t) => t.rental_kind === kind)
        .sort((a, b) => a.min_units - b.min_units),
    [data, kind],
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });

  const handleTierSave = async (tier: PricingTier) => {
    try {
      await upsertTier({
        data: {
          id: tier.id,
          rental_kind: tier.rental_kind,
          min_units: tier.min_units,
          max_units: tier.max_units,
          unit_price: tier.unit_price,
        },
      });
      toast.success("Išsaugota");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko išsaugoti");
    }
  };

  const handleAdd = async () => {
    const last = tiers[tiers.length - 1];
    const min = last ? last.max_units + 1 : 1;
    try {
      await upsertTier({
        data: {
          rental_kind: kind,
          min_units: min,
          max_units: min + 9,
          unit_price: last ? last.unit_price : 27,
        },
      });
      toast.success("Rėžis pridėtas");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko pridėti");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeTier({ data: { id } });
      toast.success("Rėžis ištrintas");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko ištrinti");
    }
  };

  const handleCopy = async () => {
    const to: RentalKind = kind === "short_term" ? "long_term" : "short_term";
    if (!window.confirm(`Nukopijuoti visus rėžius į „${KIND_LABEL[to]}“? Esami to tipo rėžiai bus pakeisti.`))
      return;
    try {
      await duplicate({ data: { from: kind, to } });
      toast.success("Nukopijuota");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko nukopijuoti");
    }
  };

  const result = data ? calculatePrice(data, kind, preview) : null;
  const currency = data?.settings.currency ?? "EUR";

  return (
    <div className="px-6 py-10 lg:px-10">
      <p className="eyebrow text-[0.7rem] text-ink/60">KAINODARA</p>
      <h1 className="mt-1 font-display text-3xl text-ink">Dinaminė kaina</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Pasiekto rėžio vieneto kaina taikoma visiems vienetams. Galutinė suma niekada nebūna mažesnė
        už minimalią mėnesinę kainą. Pakeitimai iškart matomi svetainės skaičiuoklėje.
      </p>

      {/* Nustatymai */}
      {data ? (
        <SettingsCard
          initial={data.settings}
          onSave={async (values) => {
            try {
              await persistSettings({ data: values });
              toast.success("Nustatymai išsaugoti");
              await refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Nepavyko išsaugoti");
            }
          }}
        />
      ) : null}

      {/* Nuomos tipo perjungiklis */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {(["short_term", "long_term"] as RentalKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={
              kind === k
                ? "rounded-full bg-teal-700 px-5 py-2.5 text-sm text-cream"
                : "rounded-full border border-ink/15 px-5 py-2.5 text-sm text-ink hover:bg-ink hover:text-cream"
            }
          >
            {KIND_LABEL[k]}
          </button>
        ))}
        <button type="button" onClick={handleCopy} className={BTN_GHOST}>
          Kopijuoti į kitą tipą
        </button>
      </div>

      {/* Rėžiai */}
      <div className={`${CARD} mt-6 overflow-hidden`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs tracking-wide text-ink-soft uppercase">
              <th className="px-5 py-3">Nuo (vnt.)</th>
              <th className="px-5 py-3">Iki (vnt.)</th>
              <th className="px-5 py-3">Vieneto kaina</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {pricing.isLoading ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                  Kraunama…
                </td>
              </tr>
            ) : tiers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                  Rėžių dar nėra.
                </td>
              </tr>
            ) : (
              tiers.map((tier) => (
                <TierRow
                  key={tier.id}
                  tier={tier}
                  currency={currency}
                  onSave={handleTierSave}
                  onDelete={handleDelete}
                />
              ))
            )}
          </tbody>
        </table>
        <div className="border-t border-ink/10 px-5 py-4">
          <button type="button" onClick={handleAdd} className={BTN}>
            Pridėti rėžį
          </button>
        </div>
      </div>

      {/* Peržiūra */}
      <div className={`${CARD} mt-8 p-6`}>
        <p className="text-xs tracking-wide text-ink-soft uppercase">Patikrinti skaičiavimą</p>
        <div className="mt-4 flex flex-wrap items-end gap-6">
          <div className="w-40">
            <Field label="Vienetų skaičius">
              <input
                type="number"
                min={1}
                value={preview}
                onChange={(e) => setPreview(Math.max(1, Number(e.target.value) || 1))}
                className={INPUT}
              />
            </Field>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Mėnesinė kaina</p>
            <p className="font-display text-3xl text-teal-700">
              {result ? formatPrice(result.total, currency, "lt-LT") : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Vieneto kaina</p>
            <p className="font-display text-2xl text-ink">
              {result ? formatPrice(result.unitPrice, currency, "lt-LT") : "—"}
            </p>
          </div>
          {result?.minApplied ? (
            <p className="text-xs text-ink-soft">Pritaikyta minimali mėnesinė kaina.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SettingsCard({
  initial,
  onSave,
}: {
  initial: { min_monthly_price: number; currency: string; max_units: number };
  onSave: (values: { min_monthly_price: number; currency: string; max_units: number }) => Promise<void>;
}) {
  const [minPrice, setMinPrice] = useState(String(initial.min_monthly_price));
  const [currency, setCurrency] = useState(initial.currency);
  const [maxUnits, setMaxUnits] = useState(String(initial.max_units));
  const [busy, setBusy] = useState(false);

  return (
    <div className={`${CARD} mt-6 p-6`}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Minimali mėnesinė kaina" hint="Mažesnės sumos nerodomos.">
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Valiuta">
          <input
            value={currency}
            maxLength={3}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className={INPUT}
          />
        </Field>
        <Field label="Didžiausias vienetų skaičius" hint="Slankiklio riba svetainėje.">
          <input
            type="number"
            min={1}
            value={maxUnits}
            onChange={(e) => setMaxUnits(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>
      <button
        type="button"
        disabled={busy}
        className={`${BTN} mt-5`}
        onClick={async () => {
          setBusy(true);
          await onSave({
            min_monthly_price: Number(minPrice) || 0,
            currency: currency.trim().toUpperCase() || "EUR",
            max_units: Math.max(1, Number(maxUnits) || 220),
          });
          setBusy(false);
        }}
      >
        Išsaugoti nustatymus
      </button>
    </div>
  );
}

function TierRow({
  tier,
  currency,
  onSave,
  onDelete,
}: {
  tier: PricingTier;
  currency: string;
  onSave: (tier: PricingTier) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [min, setMin] = useState(String(tier.min_units));
  const [max, setMax] = useState(String(tier.max_units));
  const [price, setPrice] = useState(String(tier.unit_price));

  const dirty =
    Number(min) !== tier.min_units ||
    Number(max) !== tier.max_units ||
    Number(price) !== tier.unit_price;

  return (
    <tr className="border-b border-ink/5 last:border-0">
      <td className="px-5 py-3">
        <input value={min} onChange={(e) => setMin(e.target.value)} className={`${INPUT} w-24`} />
      </td>
      <td className="px-5 py-3">
        <input value={max} onChange={(e) => setMax(e.target.value)} className={`${INPUT} w-24`} />
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={`${INPUT} w-28`}
          />
          <span className="text-xs text-ink-soft">{currency}</span>
        </div>
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={!dirty}
            className={`${BTN} px-4 py-2`}
            onClick={() =>
              onSave({
                ...tier,
                min_units: Math.max(1, Number(min) || 1),
                max_units: Math.max(1, Number(max) || 1),
                unit_price: Math.max(0, Number(price) || 0),
              })
            }
          >
            Išsaugoti
          </button>
          <button
            type="button"
            className="rounded-full border border-ink/15 px-4 py-2 text-sm text-ink hover:bg-ink hover:text-cream"
            onClick={() => onDelete(tier.id)}
          >
            Ištrinti
          </button>
        </div>
      </td>
    </tr>
  );
}
