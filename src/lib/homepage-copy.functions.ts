import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publicSupabase } from "@/lib/posts.server";

const langSchema = z.enum(["en", "lt"]);

/* ---------------- Viešas skaitymas (be auth) ---------------- */

export const getCopyOverrides = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ lang: langSchema }).parse(data))
  .handler(async ({ data }): Promise<{ overrides: Record<string, string> }> => {
    try {
      const { data: rows, error } = await publicSupabase()
        .from("homepage_copy")
        .select("path, value")
        .eq("lang", data.lang);

      if (error) {
        console.error("getCopyOverrides failed", error.message);
        return { overrides: {} };
      }

      const overrides: Record<string, string> = {};
      for (const row of rows ?? []) overrides[row.path] = row.value;
      return { overrides };
    } catch (err) {
      console.error("getCopyOverrides threw", err);
      return { overrides: {} };
    }
  });

/* ---------------- Administravimas ---------------- */

export const adminListCopy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ lang: langSchema }).parse(data))
  .handler(async ({ data, context }): Promise<{ overrides: Record<string, string> }> => {
    const { data: rows, error } = await context.supabase
      .from("homepage_copy")
      .select("path, value")
      .eq("lang", data.lang);

    if (error) throw new Error(error.message);

    const overrides: Record<string, string> = {};
    for (const row of rows ?? []) overrides[row.path] = row.value;
    return { overrides };
  });

export const saveCopyValue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        lang: langSchema,
        path: z.string().min(1).max(200),
        value: z.string().max(5000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.from("homepage_copy").upsert(
      {
        lang: data.lang,
        path: data.path,
        value: data.value,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      },
      { onConflict: "lang,path" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetCopyValue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ lang: langSchema, path: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("homepage_copy")
      .delete()
      .eq("lang", data.lang)
      .eq("path", data.path);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
