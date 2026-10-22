export type Billing = "monthly" | "yearly";

/** Pay per unit: tiered rate per unit, €79 monthly minimum. */
export function unitMonthlyPrice(units: number): number {
  const rate = units <= 10 ? 12 : units <= 30 ? 9.5 : units <= 60 ? 7.5 : 6;
  return Math.max(79, Math.round(units * rate));
}

/** Yearly billing: pay 10 months, get 12. Returns the per-month display price. */
export function unitDisplayPrice(units: number, billing: Billing): number {
  const base = unitMonthlyPrice(units);
  return billing === "yearly" ? Math.round((base * 10) / 12) : base;
}

/** Pay as you earn: 2% of direct bookings only. */
export function earnFee(directRevenue: number): number {
  return Math.round(directRevenue * 0.02);
}
