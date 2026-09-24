import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publicSupabase } from "@/lib/posts.server";
import {
  DEFAULT_PRICING_SETTINGS,
  type PricingData,
  type PricingTier,
  type RentalKind,
} from "@/lib/pricing";

const kindSchema = z.enum(["short_term", "long_term"]);

function normalizeTiers(rows: unknown[]): PricingTier[] {
  return (rows as PricingTier[]).map((r) => ({
    id: r.id,
    rental_kind: r.rental_kind as RentalKind,
    min_units: Number(r.min_units),
    max_units: Number(r.max_units),
    unit_price: Number(r.unit_price),
  }));
}

/* ---------------- Viešas skaitymas ---------------- */

export const getPricing = createServerFn({ method: "GET" }).handler(
  async (): Promise<PricingData> => {
    try {
      const sb = publicSupabase();
      const [tiersRes, settingsRes] = await Promise.all([
        sb.from("pricing_tiers").select("id, rental_kind, min_units, max_units, unit_price").order("min_units"),
        sb.from("pricing_settings").select("min_monthly_price, currency, max_units").limit(1).maybeSingle(),
      ]);

      const tiers = tiersRes.error ? [] : normalizeTiers(tiersRes.data ?? []);
      const s = settingsRes.error ? null : settingsRes.data;
      return {
        tiers,
        settings: s
          ? {
              min_monthly_price: Number(s.min_monthly_price),
              currency: s.currency,
              max_units: Number(s.max_units),
            }
          : DEFAULT_PRICING_SETTINGS,
      };
    } catch (err) {
      console.error("getPricing failed", err);
      return { tiers: [], settings: DEFAULT_PRICING_SETTINGS };
    }
  },
);

/* ---------------- Administravimas ---------------- */

export const adminGetPricing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PricingData> => {
    const [tiersRes, settingsRes] = await Promise.all([
      context.supabase
        .from("pricing_tiers")
        .select("id, rental_kind, min_units, max_units, unit_price")
        .order("min_units"),
      context.supabase
        .from("pricing_settings")
        .select("min_monthly_price, currency, max_units")
        .limit(1)
        .maybeSingle(),
    ]);
    if (tiersRes.error) throw new Error(tiersRes.error.message);
    const s = settingsRes.data;
    return {
      tiers: normalizeTiers(tiersRes.data ?? []),
      settings: s
        ? {
            min_monthly_price: Number(s.min_monthly_price),
            currency: s.currency,
            max_units: Number(s.max_units),
          }
        : DEFAULT_PRICING_SETTINGS,
    };
  });

export const saveTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        rental_kind: kindSchema,
        min_units: z.number().int().min(1).max(100000),
        max_units: z.number().int().min(1).max(100000),
        unit_price: z.number().min(0).max(100000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (data.max_units < data.min_units) throw new Error("Rėžio pabaiga negali būti mažesnė už pradžią.");
    const payload = {
      rental_kind: data.rental_kind,
      min_units: data.min_units,
      max_units: data.max_units,
      unit_price: data.unit_price,
    };
    const { error } = data.id
      ? await context.supabase.from("pricing_tiers").update(payload).eq("id", data.id)
      : await context.supabase.from("pricing_tiers").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.from("pricing_tiers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        min_monthly_price: z.number().min(0).max(100000),
        currency: z.string().min(3).max(3),
        max_units: z.number().int().min(1).max(100000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("pricing_settings")
      .update({
        min_monthly_price: data.min_monthly_price,
        currency: data.currency,
        max_units: data.max_units,
      })
      .eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Nukopijuoja vieno nuomos tipo laiptelius į kitą. */
export const copyTiers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ from: kindSchema, to: kindSchema }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (data.from === data.to) return { ok: true };
    const { data: rows, error } = await context.supabase
      .from("pricing_tiers")
      .select("min_units, max_units, unit_price")
      .eq("rental_kind", data.from);
    if (error) throw new Error(error.message);

    const del = await context.supabase.from("pricing_tiers").delete().eq("rental_kind", data.to);
    if (del.error) throw new Error(del.error.message);

    if ((rows ?? []).length > 0) {
      const ins = await context.supabase
        .from("pricing_tiers")
        .insert((rows ?? []).map((r) => ({ ...r, rental_kind: data.to })));
      if (ins.error) throw new Error(ins.error.message);
    }
    return { ok: true };
  });
