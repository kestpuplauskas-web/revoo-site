import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPricing } from "@/lib/pricing.functions";
import { DEFAULT_PRICING_SETTINGS } from "@/lib/pricing";

/** Minimum monthly price from admin pricing settings (single source of truth). */
export function useMinPrice(): number {
  const fetchPricing = useServerFn(getPricing);
  const [min, setMin] = useState(DEFAULT_PRICING_SETTINGS.min_monthly_price);
  useEffect(() => {
    let off = false;
    fetchPricing()
      .then((r) => {
        const v = Number(r.settings.min_monthly_price);
        if (!off && Number.isFinite(v)) setMin(v);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return min;
}

/** Replaces the {min} placeholder in copy with the admin minimum price. */
export function withMin(text: string, min: number): string {
  return text.replace(/\{min\}/g, String(Math.round(min)));
}
