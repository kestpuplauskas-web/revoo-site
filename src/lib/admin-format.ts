import type { Currency } from "@/lib/clients.functions";

export const NO_DATA = "Nėra duomenų";

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  return new Date(value).toLocaleString("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatMoney(amount: number | string | null | undefined, currency: Currency) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return "—";
  const digits = currency === "ISK" ? 0 : 2;
  const formatted = n.toLocaleString("lt-LT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${formatted} ${currency}`;
}

export function formatHours(minutes: number | null | undefined) {
  if (!minutes) return "—";
  return `${(minutes / 60).toLocaleString("lt-LT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} val.`;
}

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  lead: "Užklausa",
  negotiation: "Derybos",
  onboarding: "Diegimas",
  active: "Aktyvus",
  paused: "Pristabdytas",
  cancelled: "Nutrauktas",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planning: "Planavimas",
  development: "Kūrimas",
  onboarding: "Diegimas",
  active: "Aktyvus",
  paused: "Pristabdytas",
  cancelled: "Nutrauktas",
};

export const PAYMENT_STATE_LABELS = {
  overdue: "Pradelsta",
  pending: "Laukiama",
  paid: "Tvarkoje",
  none: NO_DATA,
} as const;
