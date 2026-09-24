import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import type { Copy } from "@/content/copy.types";
import type { Lang } from "@/lib/i18n";
import { getPricing } from "@/lib/pricing.functions";
import {
  DEFAULT_PRICING_SETTINGS,
  calculatePrice,
  formatPrice,
  type PricingData,
  type RentalKind,
} from "@/lib/pricing";

export function PricingCalculator({
  lang,
  copy,
  ctaHref,
}: {
  lang: Lang;
  copy: Copy;
  ctaHref: string;
}) {
  const c = copy.pricing;
  const locale = lang === "lt" ? "lt-LT" : "en-GB";
  const fetchPricing = useServerFn(getPricing);
  const [data, setData] = useState<PricingData>({ tiers: [], settings: DEFAULT_PRICING_SETTINGS });
  const [kind, setKind] = useState<RentalKind>("short_term");
  const [units, setUnits] = useState(36);

  useEffect(() => {
    let cancelled = false;
    fetchPricing()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        /* tylu — rodomi numatytieji nustatymai */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxUnits = data.settings.max_units || 220;
  const clamped = Math.min(Math.max(units, 1), maxUnits);
  const result = useMemo(() => calculatePrice(data, kind, clamped), [data, kind, clamped]);
  const currency = data.settings.currency || "EUR";
  const hasTiers = data.tiers.length > 0;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_30px_80px_-60px_rgba(8,32,30,0.8)] sm:p-10">
      {/* 1. Nuomos tipas */}
      <p className="eyebrow text-[0.7rem] text-ink/60">{c.step1}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <KindButton
          active={kind === "short_term"}
          onClick={() => setKind("short_term")}
          title={c.shortTitle}
          sub={c.shortSub}
        />
        <KindButton
          active={kind === "long_term"}
          onClick={() => setKind("long_term")}
          title={c.longTitle}
          sub={c.longSub}
        />
      </div>

      {/* 2. Vienetų skaičius */}
      <p className="eyebrow mt-10 text-[0.7rem] text-ink/60">{c.step2}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <label htmlFor="pricing-units" className="text-[1.05rem] text-ink">
          {c.unitsLabel}
        </label>
        <input
          id="pricing-units"
          type="number"
          min={1}
          max={maxUnits}
          value={clamped}
          onChange={(e) => setUnits(Number(e.target.value) || 1)}
          className="w-28 rounded-xl border border-ink/15 px-4 py-3 text-center font-display text-2xl text-teal-700 outline-none focus:border-teal-500"
        />
      </div>
      <input
        type="range"
        aria-label={c.unitsLabel}
        min={1}
        max={maxUnits}
        value={clamped}
        onChange={(e) => setUnits(Number(e.target.value))}
        className="pricing-range mt-5 w-full"
      />
      <div className="mt-2 flex justify-between text-xs text-ink-soft">
        <span>1</span>
        <span>{maxUnits}+</span>
      </div>
      <p className="mt-4 max-w-md text-sm text-ink-soft">{c.unitsHint}</p>

      {/* Rezultatas */}
      <div className="mt-10 grid gap-6 rounded-2xl bg-cream-deep p-6 sm:grid-cols-[1.2fr_1fr] sm:items-center">
        <div>
          <p className="eyebrow text-[0.7rem] text-ink/60">{c.totalLabel}</p>
          <p className="mt-2 font-display text-[clamp(2rem,5vw,3rem)] leading-none text-teal-700">
            {hasTiers ? formatPrice(result.total, currency, locale) : "—"}
          </p>
          <p className="mt-2 text-sm text-ink-soft">{c.perMonth}</p>
          {result.minApplied ? <p className="mt-2 text-xs text-ink-soft">{c.minNote}</p> : null}
        </div>
        <div className="sm:text-right">
          <p className="eyebrow text-[0.7rem] text-ink/60">{c.unitPriceLabel}</p>
          <p className="mt-2 font-display text-2xl text-ink">
            {hasTiers ? formatPrice(result.unitPrice, currency, locale) : "—"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{c.perUnit}</p>
        </div>
      </div>

      <div className="mt-8">
        <a
          href={ctaHref}
          className="inline-flex items-center rounded-full bg-teal-700 px-7 py-3 text-sm text-cream transition-colors hover:bg-teal-800"
        >
          {c.cta}
        </a>
      </div>
    </div>
  );
}

function KindButton({
  active,
  onClick,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border p-6 text-left transition-colors ${
        active
          ? "border-teal-700 bg-teal-100/40"
          : "border-ink/12 bg-white hover:border-ink/25"
      }`}
    >
      <span className="block text-[1.05rem] text-ink">{title}</span>
      <span className="mt-2 block text-sm text-ink-soft">{sub}</span>
    </button>
  );
}
