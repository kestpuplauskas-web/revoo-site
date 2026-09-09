import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type TemplateRow = Database["public"]["Tables"]["message_templates"]["Row"];
export type TemplateKind = Database["public"]["Enums"]["template_kind"];

export type TemplateWithStats = TemplateRow & {
  usage_count: number;
  last_used_at: string | null;
};

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ templates: TemplateWithStats[] }> => {
    const [templatesRes, statsRes] = await Promise.all([
      context.supabase
        .from("message_templates")
        .select("*")
        .order("name", { ascending: true }),
      context.supabase.from("message_template_stats").select("*"),
    ]);

    if (templatesRes.error) {
      console.error("listTemplates failed", templatesRes.error.message);
      throw new Error("Nepavyko įkelti šablonų");
    }

    const stats = new Map<string, { usage_count: number; last_used_at: string | null }>();
    for (const s of statsRes.data ?? []) {
      if (!s.template_id) continue;
      stats.set(s.template_id, {
        usage_count: Number(s.usage_count ?? 0),
        last_used_at: s.last_used_at ?? null,
      });
    }

    const templates = (templatesRes.data ?? []).map((t) => ({
      ...t,
      usage_count: stats.get(t.id)?.usage_count ?? 0,
      last_used_at: stats.get(t.id)?.last_used_at ?? null,
    }));

    templates.sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      if (b.usage_count !== a.usage_count) return b.usage_count - a.usage_count;
      return a.name.localeCompare(b.name, "lt");
    });

    return { templates };
  });

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(["email", "call"]),
  name: z.string().trim().min(1).max(120),
  subject: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  body: z.string().trim().min(1).max(8000),
  is_active: z.boolean(),
});

export const upsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => templateSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { id, ...values } = data;
    const payload = {
      ...values,
      subject: values.kind === "email" ? values.subject : null,
    };

    if (id) {
      const { error } = await context.supabase
        .from("message_templates")
        .update(payload)
        .eq("id", id);
      if (error) throw new Error("Nepavyko išsaugoti šablono");
      return { id };
    }

    const { data: inserted, error } = await context.supabase
      .from("message_templates")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error || !inserted) throw new Error("Nepavyko sukurti šablono");
    return { id: inserted.id };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { count, error: countError } = await context.supabase
      .from("client_activities")
      .select("id", { count: "exact", head: true })
      .eq("template_id", data.id);
    if (countError) throw new Error("Nepavyko patikrinti šablono naudojimo");
    if ((count ?? 0) > 0) {
      throw new Error("Šablonas jau panaudotas — jo ištrinti negalima, išjunkite jį kaip neaktyvų");
    }

    const { error } = await context.supabase
      .from("message_templates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error("Nepavyko ištrinti šablono");
    return { ok: true as const };
  });
