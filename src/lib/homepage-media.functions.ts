import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publicSupabase } from "@/lib/posts.server";
import type { SlotKey, SlotOverride } from "@/content/media-slots";
import { SLOT_MAP } from "@/content/media-slots";

const SLOT_KEYS = Object.keys(SLOT_MAP) as SlotKey[];

/* ---------------- Public (no auth, SSR-safe) ---------------- */

/**
 * Grąžina aktyvius (position = 0) perrašymus kiekvienai angai.
 * Viena užklausa, ne N+1. Jei nėra įrašų — grąžina tuščią objektą
 * ir komponentas naudoja DEFAULT_SLOTS.
 */
export const getSlotOverrides = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ overrides: Record<string, SlotOverride> }> => {
    try {
      const { data, error } = await publicSupabase()
        .from("media_assets")
        .select("slot_key, url, width, height, poster_asset_id")
        .eq("position", 0)
        .in("slot_key", SLOT_KEYS);

      if (error) {
        console.error("getSlotOverrides failed", error.message);
        return { overrides: {} };
      }

      const overrides: Record<string, SlotOverride> = {};

      // Collect poster URLs in a second pass if any asset has poster_asset_id
      const posterIds: string[] = [];
      for (const row of data ?? []) {
        if (row.poster_asset_id) posterIds.push(row.poster_asset_id);
      }

      let posterMap: Record<string, { url: string; width: number; height: number }> = {};
      if (posterIds.length > 0) {
        const { data: posters, error: posterError } = await publicSupabase()
          .from("media_assets")
          .select("id, url, width, height")
          .in("id", posterIds);
        if (!posterError && posters) {
          for (const p of posters) {
            posterMap[p.id] = { url: p.url, width: p.width, height: p.height };
          }
        }
      }

      for (const row of data ?? []) {
        const poster = row.poster_asset_id ? posterMap[row.poster_asset_id] : undefined;
        overrides[row.slot_key] = {
          url: row.url,
          width: row.width,
          height: row.height,
          ...(poster ? { posterUrl: poster.url, posterWidth: poster.width, posterHeight: poster.height } : {}),
        };
      }

      return { overrides };
    } catch (err) {
      console.error("getSlotOverrides exception", err);
      return { overrides: {} };
    }
  },
);

/* ---------------- Admin (auth + RLS) ---------------- */

export type AdminSlotAsset = {
  id: string;
  slot_key: string;
  position: number;
  url: string;
  width: number;
  height: number;
  mime: string;
  poster_asset_id: string | null;
  poster_url: string | null;
  poster_width: number | null;
  poster_height: number | null;
  uploaded_at: string;
};

export type AdminSlotView = {
  key: string;
  label: string;
  kind: string;
  ratio_w: number;
  ratio_h: number;
  max_width: number;
  used_in: string;
  assets: AdminSlotAsset[];
};

export const adminListSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ slots: AdminSlotView[] }> => {
    const { data, error } = await context.supabase
      .from("media_assets")
      .select("id, slot_key, position, url, width, height, mime, poster_asset_id, uploaded_at")
      .order("slot_key", { ascending: true })
      .order("position", { ascending: true });

    if (error) {
      console.error("adminListSlots failed", error.message);
      throw new Error("Nepavyko įkelti medijos");
    }

    // Fetch poster details
    const posterIds = (data ?? []).filter((r) => r.poster_asset_id).map((r) => r.poster_asset_id!) as string[];
    let posterMap: Record<string, { url: string; width: number; height: number }> = {};
    if (posterIds.length > 0) {
      const { data: posters } = await context.supabase
        .from("media_assets")
        .select("id, url, width, height")
        .in("id", posterIds);
      for (const p of posters ?? []) {
        posterMap[p.id] = { url: p.url, width: p.width, height: p.height };
      }
    }

    // Group by slot_key
    const bySlot: Record<string, AdminSlotAsset[]> = {};
    for (const row of data ?? []) {
      const poster = row.poster_asset_id ? posterMap[row.poster_asset_id] : undefined;
      const arr = bySlot[row.slot_key] ?? (bySlot[row.slot_key] = []);
      arr.push({
        id: row.id,
        slot_key: row.slot_key,
        position: row.position,
        url: row.url,
        width: row.width,
        height: row.height,
        mime: row.mime,
        poster_asset_id: row.poster_asset_id,
        poster_url: poster?.url ?? null,
        poster_width: poster?.width ?? null,
        poster_height: poster?.height ?? null,
        uploaded_at: row.uploaded_at,
      });
    }

    const slots: AdminSlotView[] = SLOT_KEYS.map((key) => {
      const def = SLOT_MAP[key];
      return {
        key,
        label: def.label,
        kind: def.kind,
        ratio_w: def.ratioW,
        ratio_h: def.ratioH,
        max_width: def.maxWidth,
        used_in: def.usedIn,
        assets: bySlot[key] ?? [],
      };
    });

    return { slots };
  });

const registerSchema = z.object({
  slot_key: z.enum(SLOT_KEYS as [string, ...string[]]),
  url: z.string().trim().min(1).max(500),
  storage_path: z.string().trim().min(1).max(500),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
  mime: z.string().trim().min(1).max(100),
  poster: z
    .object({
      url: z.string().trim().min(1).max(500),
      storage_path: z.string().trim().min(1).max(500),
      width: z.number().int().positive().max(10000),
      height: z.number().int().positive().max(10000),
    })
    .nullable()
    .optional(),
});

export const registerAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => registerSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { slot_key, url, storage_path, width, height, mime, poster } = data;

    // Get current max position for this slot
    const { data: existing } = await context.supabase
      .from("media_assets")
      .select("position")
      .eq("slot_key", slot_key)
      .order("position", { ascending: false })
      .limit(1);

    // New candidate goes to the END of the queue, never to position 0 (= active).
    // With an empty slot we start at 1 so the built-in default stays live until
    // the admin explicitly activates the new file.
    const nextPos = existing && existing.length > 0 ? (existing[0]?.position ?? 0) + 1 : 1;

    let posterAssetId: string | null = null;

    // Insert poster first if provided
    if (poster) {
      const { data: posterRow, error: posterError } = await context.supabase
        .from("media_assets")
        .insert({
          slot_key,
          position: nextPos,
          url: poster.url,
          storage_path: poster.storage_path,
          width: poster.width,
          height: poster.height,
          mime: "image/webp",
          poster_asset_id: null,
          uploaded_by: context.userId,
        })
        .select("id")
        .single();

      if (posterError || !posterRow) {
        throw new Error("Nepavyko išsaugoti posterio");
      }
      posterAssetId = posterRow.id;
    }

    const { data: assetRow, error } = await context.supabase
      .from("media_assets")
      .insert({
        slot_key,
        position: nextPos,
        url,
        storage_path,
        width,
        height,
        mime,
        poster_asset_id: posterAssetId,
        uploaded_by: context.userId,
      })
      .select("id")
      .single();

    if (error || !assetRow) {
      throw new Error("Nepavyko išsaugoti kandidato");
    }

    return { id: assetRow.id };
  });

const activateSchema = z.object({
  slot_key: z.enum(SLOT_KEYS as [string, ...string[]]),
  asset_id: z.string().uuid(),
});

export const activateAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => activateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { slot_key, asset_id } = data;

    // Get all assets in this slot ordered by position
    const { data: assets, error } = await context.supabase
      .from("media_assets")
      .select("id, position")
      .eq("slot_key", slot_key)
      .order("position", { ascending: true });

    if (error) throw new Error("Nepavyko perskaičiuoti eilės");

    if (!assets || !assets.some((a) => a.id === asset_id)) {
      throw new Error("Kandidatas nerastas");
    }

    // Move activated asset to position 0, shift others up
    const reordered = assets.filter((a) => a.id !== asset_id);

    // Activated asset → position 0
    await context.supabase.from("media_assets").update({ position: 0 }).eq("id", asset_id);

    // Others → positions 1, 2, 3...
    for (let i = 0; i < reordered.length; i++) {
      await context.supabase.from("media_assets").update({ position: i + 1 }).eq("id", reordered[i]!.id);
    }

    return { ok: true as const };
  });

const reorderSchema = z.object({
  slot_key: z.enum(SLOT_KEYS as [string, ...string[]]),
  ordered_ids: z.array(z.string().uuid()),
});

export const reorderSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reorderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { slot_key, ordered_ids } = data;

    // Verify the ordered_ids match exactly the assets in this slot
    const { data: assets, error } = await context.supabase
      .from("media_assets")
      .select("id")
      .eq("slot_key", slot_key)
      .order("position", { ascending: true });

    if (error) throw new Error("Nepavyko perskaičiuoti eilės");

    const existingIds = (assets ?? []).map((a) => a.id).sort();
    const requestedIds = [...ordered_ids].sort();

    if (existingIds.length !== requestedIds.length || !existingIds.every((id, i) => id === requestedIds[i])) {
      throw new Error("Eilės sudėtis nesutampa su esamais kandidatais");
    }

    // Write new positions sequentially
    for (let i = 0; i < ordered_ids.length; i++) {
      await context.supabase.from("media_assets").update({ position: i }).eq("id", ordered_ids[i]!);
    }

    return { ok: true as const };
  });

const deactivateSchema = z.object({
  slot_key: z.enum(SLOT_KEYS as [string, ...string[]]),
});

/** Grąžina angą prie numatytojo failo: visi įkelti failai lieka kandidatais (pozicijos nuo 1). */
export const deactivateSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deactivateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: assets, error } = await context.supabase
      .from("media_assets")
      .select("id")
      .eq("slot_key", data.slot_key)
      .order("position", { ascending: true });

    if (error) throw new Error("Nepavyko perskaičiuoti eilės");

    for (let i = 0; i < (assets ?? []).length; i++) {
      await context.supabase.from("media_assets").update({ position: i + 1 }).eq("id", assets![i]!.id);
    }

    return { ok: true as const };
  });

const deleteSchema = z.object({ id: z.string().uuid() });

export const deleteAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Get asset info before deleting (for storage_path + slot_key + position)
    const { data: asset, error: fetchError } = await context.supabase
      .from("media_assets")
      .select("id, slot_key, position, storage_path, poster_asset_id")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchError || !asset) {
      throw new Error("Kandidatas nerastas");
    }

    // Delete poster first if it exists as a separate asset
    if (asset.poster_asset_id) {
      const { data: poster } = await context.supabase
        .from("media_assets")
        .select("storage_path")
        .eq("id", asset.poster_asset_id)
        .maybeSingle();
      if (poster?.storage_path) {
        await context.supabase.storage.from("site-media").remove([poster.storage_path]);
      }
      await context.supabase.from("media_assets").delete().eq("id", asset.poster_asset_id);
    }

    // Delete the asset itself
    const { error: deleteError } = await context.supabase
      .from("media_assets")
      .delete()
      .eq("id", data.id);

    if (deleteError) throw new Error("Nepavyko ištrinti kandidato");

    // Delete file from storage
    await context.supabase.storage.from("site-media").remove([asset.storage_path]);

    // Compact positions for remaining assets in the slot
    const { data: remaining } = await context.supabase
      .from("media_assets")
      .select("id")
      .eq("slot_key", asset.slot_key)
      .order("position", { ascending: true });

    // Compact positions. If the active file (position 0) was deleted, the slot falls
    // back to the built-in default — remaining files stay candidates (from 1).
    const offset = asset.position === 0 ? 1 : 0;
    if (remaining) {
      for (let i = 0; i < remaining.length; i++) {
        await context.supabase
          .from("media_assets")
          .update({ position: i + offset })
          .eq("id", remaining[i]!.id);
      }
    }

    return { ok: true as const };
  });
