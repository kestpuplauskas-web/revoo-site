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
  lead: "Naujas",
  contacted: "Susisiekta",
  awaiting_reply: "Laukiama atsakymo",
  replied: "Gautas atsakymas",
  demo_scheduled: "Demo suderinta",
  proposal_sent: "Pasiūlymas išsiųstas",
  negotiation: "Derybos",
  won: "Laimėta",
  lost: "Prarasta",
  onboarding: "Diegimas",
  active: "Aktyvus",
  paused: "Pristabdytas",
  cancelled: "Nutrauktas",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: "Skambutis",
  email: "Laiškas",
  meeting: "Susitikimas",
  demo: "Demo",
  proposal: "Pasiūlymas",
  note: "Pastaba",
  task: "Užduotis",
};

export const CLIENT_FIELD_LABELS: Record<string, string> = {
  created: "Objektas sukurtas",
  status: "Būsena",
  assigned_to: "Atsakingas",
  contact_name: "Kontaktinis asmuo",
  contact_email: "Kontaktinis el. paštas",
  contact_phone: "Telefonas",
  units_count: "Kambarių skaičius",
  next_action: "Kitas veiksmas",
  next_action_date: "Kito veiksmo data",
  name: "Pavadinimas",
  website_url: "Svetainė",
  developer: "Statytojas",
  city: "Miestas",
  country: "Šalis",
  property_type: "Tipas",
  building_area_sqm: "Pastato plotas",
  notes: "Pastaba",
  company_name: "Įmonė",
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
