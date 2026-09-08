import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type ContractRow = Database["public"]["Tables"]["client_contracts"]["Row"];
export type SettingsRow = Database["public"]["Tables"]["admin_settings"]["Row"];
export type ClientStatus = Database["public"]["Enums"]["client_status"];
export type ProjectStatus = Database["public"]["Enums"]["project_status"];
export type Currency = Database["public"]["Enums"]["currency_code"];

export const CLIENT_STATUSES: ClientStatus[] = [
  "lead",
  "negotiation",
  "onboarding",
  "active",
  "paused",
  "cancelled",
];
export const PROJECT_STATUSES: ProjectStatus[] = [
  "planning",
  "development",
  "onboarding",
  "active",
  "paused",
  "cancelled",
];
export const CURRENCIES: Currency[] = ["EUR", "USD", "GBP", "PLN", "ISK", "OTHER"];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

const optionalNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  });

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

/* ------------------------------------------------------------------ list */

export type ProjectListItem = ProjectRow & {
  client: Pick<
    ClientRow,
    "id" | "name" | "company_name" | "country" | "city" | "property_type" | "units_count" | "status"
  >;
  contract: Pick<
    ContractRow,
    "monthly_subscription" | "setup_fee" | "currency" | "next_payment_date"
  > | null;
};

export type CurrencyTotals = { currency: Currency; total: number }[];

/**
 * „Valdomi projektai“ rodo TIK rankiniu būdu sukurtus projektus.
 * Kliento būsena registre čia nieko nesukuria ir neįtakoja sąrašo.
 */
export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [projectsRes, clientsRes, contractsRes] = await Promise.all([
      context.supabase.from("projects").select("*").order("created_at", { ascending: false }),
      context.supabase.from("clients").select("*"),
      context.supabase.from("client_contracts").select("*"),
    ]);

    if (projectsRes.error || clientsRes.error || contractsRes.error) {
      console.error(
        "listProjects failed",
        projectsRes.error?.message,
        clientsRes.error?.message,
        contractsRes.error?.message,
      );
      throw new Error("Nepavyko įkelti projektų");
    }

    const clients = clientsRes.data ?? [];
    const contracts = contractsRes.data ?? [];

    const items: ProjectListItem[] = (projectsRes.data ?? []).flatMap((project) => {
      const client = clients.find((c) => c.id === project.client_id);
      if (!client) return [];
      const contract = contracts.find((c) => c.client_id === project.client_id) ?? null;
      return [
        {
          ...project,
          client: {
            id: client.id,
            name: client.name,
            company_name: client.company_name,
            country: client.country,
            city: client.city,
            property_type: client.property_type,
            units_count: client.units_count,
            status: client.status,
          },
          contract: contract
            ? {
                monthly_subscription: contract.monthly_subscription,
                setup_fee: contract.setup_fee,
                currency: contract.currency,
                next_payment_date: contract.next_payment_date,
              }
            : null,
        },
      ];
    });

    // KPI skaičiuojami tik pagal klientus, kurie turi bent vieną projektą.
    const mrrMap = new Map<Currency, number>();
    const setupMap = new Map<Currency, number>();
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.client.id)) continue;
      seen.add(item.client.id);
      const c = item.contract;
      if (!c) continue;
      if (item.client.status === "active" && c.monthly_subscription) {
        mrrMap.set(c.currency, (mrrMap.get(c.currency) ?? 0) + Number(c.monthly_subscription));
      }
      if (c.setup_fee) {
        setupMap.set(c.currency, (setupMap.get(c.currency) ?? 0) + Number(c.setup_fee));
      }
    }
    const toTotals = (m: Map<Currency, number>): CurrencyTotals =>
      [...m.entries()]
        .filter(([, total]) => total > 0)
        .map(([currency, total]) => ({ currency, total }))
        .sort((a, b) => b.total - a.total);

    return {
      projects: items,
      kpi: {
        activeProjects: items.filter((p) => p.project_status === "active").length,
        onboardingProjects: items.filter(
          (p) => p.project_status === "onboarding" || p.project_status === "development",
        ).length,
        mrr: toTotals(mrrMap),
        setupRevenue: toTotals(setupMap),
      },
    };
  });

/** Klientų sąrašas projekto kūrimo langui. */
export const listClientOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clients")
      .select("id, name, company_name, status")
      .order("name", { ascending: true });
    if (error) throw new Error("Nepavyko įkelti klientų sąrašo");
    return { clients: data ?? [] };
  });

/* ------------------------------------------------------------- client page */

export const getClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [clientRes, contractRes, projectsRes] = await Promise.all([
      context.supabase.from("clients").select("*").eq("id", data.id).maybeSingle(),
      context.supabase.from("client_contracts").select("*").eq("client_id", data.id).maybeSingle(),
      context.supabase
        .from("projects")
        .select("*")
        .eq("client_id", data.id)
        .order("created_at", { ascending: false }),
    ]);

    if (clientRes.error || !clientRes.data) throw new Error("Klientas nerastas");

    let lead: { id: string; name: string; property_name: string; created_at: string } | null = null;
    if (clientRes.data.source_lead_id) {
      const { data: leadRow } = await context.supabase
        .from("leads")
        .select("id, name, property_name, created_at")
        .eq("id", clientRes.data.source_lead_id)
        .maybeSingle();
      lead = leadRow ?? null;
    }

    return {
      client: clientRes.data,
      contract: contractRes.data ?? null,
      projects: projectsRes.data ?? [],
      lead,
    };
  });

/* --------------------------------------------------------------- mutations */

const clientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  company_name: optionalText(160),
  country: optionalText(80),
  city: optionalText(80),
  property_type: optionalText(80),
  units_count: optionalNumber,
  contact_name: optionalText(120),
  contact_email: optionalText(255),
  contact_phone: optionalText(60),
  notes: optionalText(4000),
  status: z.enum(["lead", "negotiation", "onboarding", "active", "paused", "cancelled"]),
  source_lead_id: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const saveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => clientSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { id, ...values } = data;
    const payload = {
      ...values,
      units_count: values.units_count === null ? null : Math.max(0, Math.round(values.units_count)),
    };

    if (id) {
      const { error } = await context.supabase.from("clients").update(payload).eq("id", id);
      if (error) throw new Error(mapError(error.message));
      return { id };
    }
    const { data: inserted, error } = await context.supabase
      .from("clients")
      .insert(payload)
      .select("id")
      .single();
    if (error || !inserted) throw new Error(mapError(error?.message ?? ""));
    return { id: inserted.id };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tables = ["projects", "support_tickets", "time_entries", "payments"] as const;
    for (const table of tables) {
      const { count } = await context.supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("client_id", data.id);
      if ((count ?? 0) > 0) {
        const { error } = await context.supabase
          .from("clients")
          .update({ status: "cancelled" })
          .eq("id", data.id);
        if (error) throw new Error("Nepavyko atnaujinti kliento būsenos");
        return { deleted: false as const };
      }
    }
    await context.supabase.from("client_contracts").delete().eq("client_id", data.id);
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) throw new Error("Nepavyko ištrinti kliento");
    return { deleted: true as const };
  });

const projectSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  project_name: z.string().trim().min(1).max(160),
  website_url: optionalText(500),
  lovable_url: optionalText(500),
  github_url: optionalText(500),
  supabase_url: optionalText(500),
  launch_date: optionalDate,
  project_status: z.enum([
    "planning",
    "development",
    "onboarding",
    "active",
    "paused",
    "cancelled",
  ]),
  notes: optionalText(4000),
});

export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => projectSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { id, ...values } = data;
    if (id) {
      const { error } = await context.supabase.from("projects").update(values).eq("id", id);
      if (error) throw new Error("Nepavyko išsaugoti projekto");
      return { id };
    }
    const { data: inserted, error } = await context.supabase
      .from("projects")
      .insert(values)
      .select("id")
      .single();
    if (error || !inserted) throw new Error("Nepavyko sukurti projekto");
    return { id: inserted.id };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    for (const table of ["support_tickets", "time_entries"] as const) {
      const { count } = await context.supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("project_id", data.id);
      if ((count ?? 0) > 0) {
        const { error } = await context.supabase
          .from("projects")
          .update({ project_status: "cancelled" })
          .eq("id", data.id);
        if (error) throw new Error("Nepavyko atnaujinti projekto būsenos");
        return { deleted: false as const };
      }
    }
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error("Nepavyko ištrinti projekto");
    return { deleted: true as const };
  });

const contractSchema = z.object({
  client_id: z.string().uuid(),
  setup_fee: optionalNumber,
  monthly_subscription: optionalNumber,
  currency: z.enum(["EUR", "USD", "GBP", "PLN", "ISK", "OTHER"]),
  next_payment_date: optionalDate,
  contract_start_date: optionalDate,
  contract_end_date: optionalDate,
});

export const saveContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => contractSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("client_contracts")
      .upsert(data, { onConflict: "client_id" });
    if (error) {
      console.error("saveContract failed", error.message);
      throw new Error("Nepavyko išsaugoti komercinių sąlygų");
    }
    return { ok: true as const };
  });

/* ---------------------------------------------------------------- settings */

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("admin_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error("Nepavyko įkelti nustatymų");
    return { settings: data as SettingsRow | null };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        default_hourly_internal_cost: optionalNumber,
        base_currency: z.enum(["EUR", "USD", "GBP", "PLN", "ISK", "OTHER"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("admin_settings")
      .update({
        default_hourly_internal_cost: Math.max(0, data.default_hourly_internal_cost ?? 0),
        base_currency: data.base_currency,
      })
      .eq("id", data.id);
    if (error) throw new Error("Nepavyko išsaugoti nustatymų");
    return { ok: true as const };
  });

/* ------------------------------------------------------------------- leads */

export const listConvertibleLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ include_id: z.string().uuid().optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const [leadsRes, usedRes] = await Promise.all([
      context.supabase
        .from("leads")
        .select("id, name, property_name, created_at")
        .order("created_at", { ascending: false })
        .limit(300),
      context.supabase.from("clients").select("source_lead_id").not("source_lead_id", "is", null),
    ]);
    if (leadsRes.error) throw new Error("Nepavyko įkelti užklausų");
    const used = new Set(
      (usedRes.data ?? []).map((r) => r.source_lead_id).filter((v): v is string => Boolean(v)),
    );
    return {
      leads: (leadsRes.data ?? []).filter(
        (lead) => !used.has(lead.id) || lead.id === data.include_id,
      ),
    };
  });

export const listLeadConversions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clients")
      .select("id, name, source_lead_id")
      .not("source_lead_id", "is", null);
    if (error) return { conversions: [] };
    return {
      conversions: (data ?? []).map((row) => ({
        lead_id: row.source_lead_id as string,
        client_id: row.id,
        client_name: row.name,
      })),
    };
  });

function mapError(message: string) {
  if (message.includes("clients_source_lead_id_key")) {
    return "Ši užklausa jau susieta su kitu klientu";
  }
  console.error("clients mutation failed", message);
  return "Nepavyko išsaugoti kliento";
}
