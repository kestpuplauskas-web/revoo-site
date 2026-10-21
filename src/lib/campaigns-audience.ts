import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type CampaignAudienceFilters = {
  statuses: string[];
  countries: string[];
  minUnits: number | null;
  maxUnits: number | null;
  created: string | null;
};

/** Half-open UTC interval for the date displayed in Lithuania, including DST. */
export function vilniusDateBounds(day: string) {
  const parsed = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) {
    throw new Error("Pasirinkite galiojančią sukūrimo datą");
  }
  const offsetFormat = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Vilnius",
    timeZoneName: "shortOffset",
  });
  const midnight = (utc: number) => {
    let instant = utc;
    for (let i = 0; i < 3; i++) {
      const zone = offsetFormat.formatToParts(new Date(instant)).find((p) => p.type === "timeZoneName")?.value;
      const match = zone?.match(/^GMT([+-])(\d+)(?::(\d+))?$/);
      if (!match) throw new Error("Nepavyko nustatyti datos laiko juostos");
      const minutes = (Number(match[2]) * 60 + Number(match[3] ?? 0)) * (match[1] === "+" ? 1 : -1);
      instant = utc - minutes * 60000;
    }
    return new Date(instant).toISOString();
  };
  return { start: midnight(parsed.getTime()), end: midnight(parsed.getTime() + 86400000) };
}

/** Never rely on .limit() to override the Data API's per-request ceiling. */
export async function fetchAllCampaignRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  errorMessage: string,
): Promise<T[]> {
  const rows: T[] = [];
  const size = 500;
  for (let from = 0; ; from += size) {
    const result = await page(from, from + size - 1);
    if (result.error) throw new Error(errorMessage);
    const batch = result.data ?? [];
    rows.push(...batch);
    if (batch.length < size) return rows;
  }
}

export async function loadCampaignAudience(supabase: SupabaseClient<Database>, f: CampaignAudienceFilters) {
  const bounds = f.created ? vilniusDateBounds(f.created) : null;
  const [rows, unsubs] = await Promise.all([
    fetchAllCampaignRows((from, to) => {
      let q = supabase.from("clients")
        .select("id, name, contact_name, contact_email, country, status, created_at")
        .not("contact_email", "is", null)
        .order("id");
      if (f.statuses.length) q = q.in("status", f.statuses as Database["public"]["Enums"]["client_status"][]);
      if (f.countries.length) q = q.in("country", f.countries);
      if (f.minUnits !== null) q = q.gte("units_count", f.minUnits);
      if (f.maxUnits !== null) q = q.lte("units_count", f.maxUnits);
      if (bounds) q = q.gte("created_at", bounds.start).lt("created_at", bounds.end);
      return q.range(from, to);
    }, "Nepavyko atrinkti klientų"),
    fetchAllCampaignRows((from, to) => supabase.from("email_unsubscribes")
      .select("email").order("email").range(from, to), "Nepavyko patikrinti prenumeratos atsisakymų"),
  ]);
  const blocked = new Set(unsubs.map((u) => u.email.trim().toLowerCase()));
  const seen = new Set<string>();
  const out: { id: string; name: string; email: string; contact_name: string | null }[] = [];
  for (const c of rows) {
    const email = String(c.contact_email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email) || blocked.has(email)) continue;
    seen.add(email);
    out.push({ id: c.id, name: c.name, email, contact_name: c.contact_name });
  }
  return out;
}