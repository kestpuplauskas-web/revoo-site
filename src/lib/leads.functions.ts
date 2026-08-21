import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const LEAD_COLUMNS =
  "id, created_at, name, email, property_name, country, property_type, units, current_system, notes, lang, source, read_at, archived_at";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

const submitSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  property_name: z.string().trim().min(1).max(160),
  country: optionalText(80),
  property_type: optionalText(80),
  units: optionalText(40),
  current_system: optionalText(120),
  notes: optionalText(4000),
  lang: z.enum(["en", "lt"]),
  user_agent: optionalText(500),
  // Honeypot — real users never fill this in.
  company_website: z.string().max(200).optional(),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.company_website && data.company_website.length > 0) {
      return { ok: true as const };
    }

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { error } = await supabase.from("leads").insert({
      name: data.name,
      email: data.email,
      property_name: data.property_name,
      country: data.country,
      property_type: data.property_type,
      units: data.units,
      current_system: data.current_system,
      notes: data.notes,
      lang: data.lang,
      source: "revoo.site demo forma",
      user_agent: data.user_agent,
    });

    if (error) {
      console.error("submitLead failed", error.message);
      throw new Error("Nepavyko išsaugoti užklausos");
    }

    return { ok: true as const };
  });

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) {
      console.error("getMyRole failed", error.message);
      return { isAdmin: false };
    }
    return { isAdmin: data === true };
  });

const listSchema = z.object({
  filter: z.enum(["all", "unread", "archived"]).default("all"),
  search: z.string().trim().max(120).default(""),
});

export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sel = (s: string): string => s;
    let query = context.supabase
      .from("leads")
      .select(sel(LEAD_COLUMNS))
      .order("created_at", { ascending: false })
      .limit(500);

    if (data.filter === "archived") {
      query = query.not("archived_at", "is", null);
    } else {
      query = query.is("archived_at", null);
      if (data.filter === "unread") query = query.is("read_at", null);
    }

    if (data.search) {
      const term = data.search.replace(/[%,]/g, "");
      query = query.or(
        `name.ilike.%${term}%,email.ilike.%${term}%,property_name.ilike.%${term}%`,
      );
    }

    const { data: rows, error } = await query.returns<LeadRow[]>();
    if (error) {
      console.error("listLeads failed", error.message);
      throw new Error("Nepavyko įkelti užklausų");
    }
    return { leads: rows ?? [] };
  });

export const getUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null)
      .is("read_at", null);
    if (error) return { count: 0 };
    return { count: count ?? 0 };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  read: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const patch: { read_at?: string | null; archived_at?: string | null } = {};
    const now = new Date().toISOString();
    if (data.read !== undefined) patch.read_at = data.read ? now : null;
    if (data.archived !== undefined) patch.archived_at = data.archived ? now : null;

    const { error } = await context.supabase.from("leads").update(patch).eq("id", data.id);
    if (error) {
      console.error("updateLead failed", error.message);
      throw new Error("Nepavyko atnaujinti užklausos");
    }
    return { ok: true as const };
  });
