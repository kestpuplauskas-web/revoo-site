export type RentalKind = "short_term" | "long_term";

export type PricingTier = {
  id: string;
  rental_kind: RentalKind;
  min_units: number;
  max_units: number;
  unit_price: number;
};

export type PricingSettings = {
  min_monthly_price: number;
  max_monthly_price: number | null;
  currency: string;
  max_units: number;
};

export type PricingData = {
  tiers: PricingTier[];
  settings: PricingSettings;
};

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  min_monthly_price: 79,
  max_monthly_price: null,
  currency: "EUR",
  max_units: 220,
};

/** Suranda rėžį, į kurį patenka vienetų skaičius (arba paskutinį, jei viršija). */
export function findTier(tiers: PricingTier[], kind: RentalKind, units: number): PricingTier | null {
  const list = tiers
    .filter((t) => t.rental_kind === kind)
    .sort((a, b) => a.min_units - b.min_units);
  if (list.length === 0) return null;
  const hit = list.find((t) => units >= t.min_units && units <= t.max_units);
  if (hit) return hit;
  const last = list[list.length - 1]!;
  if (units > last.max_units) return last;
  return list[0]!;
}

export type PriceResult = {
  unitPrice: number;
  total: number;
  minApplied: boolean;
  maxApplied: boolean;
  tier: PricingTier | null;
};

/** Pasiekto rėžio kaina taikoma VISIEMS vienetams; suma ne mažesnė nei minimali ir ne didesnė nei maksimali (jei nustatyta). */
export function calculatePrice(
  data: PricingData,
  kind: RentalKind,
  units: number,
): PriceResult {
  const tier = findTier(data.tiers, kind, units);
  const unitPrice = tier ? Number(tier.unit_price) : 0;
  const raw = unitPrice * Math.max(1, units);
  const min = Number(data.settings.min_monthly_price) || 0;
  const max = data.settings.max_monthly_price != null ? Number(data.settings.max_monthly_price) : null;
  let total = Math.max(raw, min);
  let maxApplied = false;
  if (max != null && max > 0 && total > max) {
    total = max;
    maxApplied = true;
  }
  return { unitPrice, total, minApplied: !maxApplied && total > raw, maxApplied, tier };
}

export function formatPrice(value: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${Math.round(value)} ${currency}`;
  }
}
