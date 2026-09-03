import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
export type ActivityRow = Database["public"]["Tables"]["client_activities"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ClientStatus = Database["public"]["Enums"]["client_status"];
export type ActivityType = Database["public"]["Enums"]["activity_type"];

/** Pardavimo piltuvėlio eiga (registro sąsajoje rodoma šia tvarka). */
export const PIPELINE_STATUSES: ClientStatus[] = [
  "lead",
  "contacted",
  "awaiting_reply",
  "replied",
  "demo_scheduled",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

/** Būsenos, kurios jau egzistavo klientų valdyme — registre rodomos po piltuvėlio. */
export const DELIVERY_STATUSES: ClientStatus[] = [
  "onboarding",
  "active",
  "paused",
  "cancelled",
];

export const ALL_STATUSES: ClientStatus[] = [...PIPELINE_STATUSES, ...DELIVERY_STATUSES];

export const ACTIVITY_TYPES: ActivityType[] = [
  "call",
  "email",
  "meeting",
  "demo",
  "proposal",
  "note",
  "task",
];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null));

const optionalNumber = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  });

const optionalDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalUuid = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null));

/* --------------------------------------------------------------- profiles */

export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | null)?.email ?? null;
    const { data: existing } = await context.supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", context.userId)
      .maybeSingle();

    if (!existing) {
      const fallback = email ? (email.split("@")[0] ?? email) : "Naudotojas";
      await context.supabase
        .from("profiles")
        .insert({ id: context.userId, email, full_name: fallback });
      return { id: context.userId, full_name: fallback, email };
    }
    if (email && existing.email !== email) {
      await context.supabase.from("profiles").update({ email }).eq("id", context.userId);
    }
    return existing;
  });

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name", { ascending: true });
    return { team: data ?? [], me: context.userId };
  });

export const updateMyName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ full_name: z.string().trim().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.full_name })
      .eq("id", context.userId);
    if (error) throw new Error("Nepavyko išsaugoti vardo");
    return { ok: true as const };
  });

/* ------------------------------------------------------------------- list */

export type RegistryItem = ClientRow;

export const listRegistry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [clientsRes, teamRes] = await Promise.all([
      context.supabase.from("clients").select("*").order("created_at", { ascending: false }),
      context.supabase.from("profiles").select("id, full_name, email"),
    ]);
    if (clientsRes.error) {
      console.error("listRegistry failed", clientsRes.error.message);
      throw new Error("Nepavyko įkelti registro");
    }

    const clients = clientsRes.data ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const byStatus: Record<string, number> = {};
    for (const c of clients) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;

    return {
      clients,
      team: teamRes.data ?? [],
      summary: {
        total: clients.length,
        byStatus,
        overdue: clients.filter((c) => c.next_action_date && c.next_action_date < today).length,
        unassigned: clients.filter((c) => !c.assigned_to).length,
      },
      today,
    };
  });

/* ------------------------------------------------------------ single card */

export const getRegistryClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [clientRes, activitiesRes, teamRes] = await Promise.all([
      context.supabase.from("clients").select("*").eq("id", data.id).maybeSingle(),
      context.supabase
        .from("client_activities")
        .select("*")
        .eq("client_id", data.id)
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false }),
      context.supabase.from("profiles").select("id, full_name, email"),
    ]);

    if (clientRes.error || !clientRes.data) throw new Error("Objektas nerastas");

    return {
      client: clientRes.data,
      activities: activitiesRes.data ?? [],
      team: teamRes.data ?? [],
      me: context.userId,
    };
  });

/* -------------------------------------------------------------- mutations */

const registrySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  units_count: optionalNumber,
  building_area_sqm: optionalNumber,
  developer: optionalText(160),
  city: optionalText(80),
  country: optionalText(80),
  property_type: optionalText(80),
  website_url: optionalText(300),
  contact_name: optionalText(120),
  contact_email: optionalText(255),
  contact_phone: optionalText(60),
  notes: optionalText(4000),
  status: z.enum(ALL_STATUSES as [ClientStatus, ...ClientStatus[]]),
  next_action: optionalText(400),
  next_action_date: optionalDate,
  assigned_to: optionalUuid,
});

export const saveRegistryClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => registrySchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { id, ...values } = data;
    const payload = {
      ...values,
      units_count: values.units_count === null ? null : Math.max(0, Math.round(values.units_count)),
    };

    if (id) {
      const { error } = await context.supabase.from("clients").update(payload).eq("id", id);
      if (error) throw new Error("Nepavyko išsaugoti objekto");
      return { id };
    }
    const { data: inserted, error } = await context.supabase
      .from("clients")
      .insert(payload)
      .select("id")
      .single();
    if (error || !inserted) throw new Error("Nepavyko sukurti objekto");
    return { id: inserted.id };
  });

const activitySchema = z.object({
  client_id: z.string().uuid(),
  activity_type: z.enum(ACTIVITY_TYPES as [ActivityType, ...ActivityType[]]),
  body: z.string().trim().min(1).max(4000),
  occurred_at: z.string().min(1),
});

export const addActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => activitySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("client_activities").insert({
      client_id: data.client_id,
      kind: "manual",
      activity_type: data.activity_type,
      body: data.body,
      occurred_at: new Date(data.occurred_at).toISOString(),
      author_id: context.userId,
    });
    if (error) throw new Error("Nepavyko įrašyti veiksmo");
    return { ok: true as const };
  });

export const deleteActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("client_activities")
      .delete()
      .eq("id", data.id)
      .eq("kind", "manual");
    if (error) throw new Error("Nepavyko ištrinti įrašo");
    return { ok: true as const };
  });

/* ------------------------------------------------------------ CSV importas */

const importRowSchema = z.object({
  name: z.string().trim().min(1).max(160),
  units_count: z.number().nullable().optional(),
  building_area_sqm: z.number().nullable().optional(),
  developer: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  property_type: z.string().nullable().optional(),
  website_url: z.string().nullable().optional(),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type ImportRow = z.infer<typeof importRowSchema>;

const domainOf = (url: string | null | undefined) => {
  if (!url) return null;
  const raw = url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  const host = raw.split("/")[0] ?? "";
  return host.length > 0 ? host : null;
};

export const importClientsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ rows: z.array(importRowSchema).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing, error } = await context.supabase
      .from("clients")
      .select("id, name, city, contact_email, website_url");
    if (error) throw new Error("Nepavyko patikrinti esamų objektų");

    const byDomain = new Map<string, string>();
    const byEmail = new Map<string, string>();
    const byNameCity = new Map<string, string>();
    const register = (row: {
      id: string;
      name: string;
      city: string | null;
      contact_email: string | null;
      website_url: string | null;
    }) => {
      const d = domainOf(row.website_url);
      if (d && !byDomain.has(d)) byDomain.set(d, row.id);
      const e = row.contact_email?.trim().toLowerCase();
      if (e && !byEmail.has(e)) byEmail.set(e, row.id);
      const nc = `${row.name.trim().toLowerCase()}|${(row.city ?? "").trim().toLowerCase()}`;
      if (!byNameCity.has(nc)) byNameCity.set(nc, row.id);
    };
    for (const row of existing ?? []) register(row);

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [index, row] of data.rows.entries()) {
      const d = domainOf(row.website_url ?? null);
      const e = row.contact_email?.trim().toLowerCase() ?? null;
      const nc = `${row.name.trim().toLowerCase()}|${(row.city ?? "").trim().toLowerCase()}`;
      if ((d && byDomain.has(d)) || (e && byEmail.has(e)) || byNameCity.has(nc)) {
        skipped += 1;
        continue;
      }

      const payload = {
        name: row.name.trim(),
        units_count:
          row.units_count === null || row.units_count === undefined
            ? null
            : Math.max(0, Math.round(row.units_count)),
        building_area_sqm: row.building_area_sqm ?? null,
        developer: row.developer ?? null,
        city: row.city ?? null,
        country: row.country ?? null,
        property_type: row.property_type ?? null,
        website_url: row.website_url ?? null,
        contact_name: row.contact_name ?? null,
        contact_email: row.contact_email ?? null,
        contact_phone: row.contact_phone ?? null,
        notes: row.notes ?? null,
        status: "lead" as ClientStatus,
      };

      const { data: inserted, error: insertError } = await context.supabase
        .from("clients")
        .insert(payload)
        .select("id, name, city, contact_email, website_url")
        .single();

      if (insertError || !inserted) {
        errors.push(`${index + 1} eilutė: ${insertError?.message ?? "nepavyko įrašyti"}`);
        continue;
      }
      created += 1;
      register(inserted);
    }

    return { created, skipped, errors: errors.slice(0, 20), errorCount: errors.length };
  });
