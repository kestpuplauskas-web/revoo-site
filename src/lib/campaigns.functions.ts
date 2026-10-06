import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type CampaignRow = Database["public"]["Tables"]["email_campaigns"]["Row"];
export type SenderRow = Database["public"]["Tables"]["email_senders"]["Row"];
export type RecipientRow = Database["public"]["Tables"]["campaign_recipients"]["Row"];
export type CampaignStats = { total: number; pending: number; sent: number; failed: number; unsubscribed: number };

const filtersSchema = z.object({
  statuses: z.array(z.string().max(40)).max(20).default([]),
  countries: z.array(z.string().max(80)).max(50).default([]),
  minUnits: z.number().int().min(0).nullable().default(null),
  maxUnits: z.number().int().min(0).nullable().default(null),
});
export type AudienceFilters = z.infer<typeof filtersSchema>;

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Neturite teisių");
}

async function audience(supabase: any, f: AudienceFilters) {
  let q = supabase
    .from("clients")
    .select("id, name, contact_name, contact_email, country, status")
    .not("contact_email", "is", null)
    .limit(20000);
  if (f.statuses.length) q = q.in("status", f.statuses);
  if (f.countries.length) q = q.in("country", f.countries);
  if (f.minUnits !== null) q = q.gte("units_count", f.minUnits);
  if (f.maxUnits !== null) q = q.lte("units_count", f.maxUnits);
  const { data, error } = await q;
  if (error) throw new Error("Nepavyko atrinkti klientų");
  const { data: unsubs } = await supabase.from("email_unsubscribes").select("email");
  const blocked = new Set((unsubs ?? []).map((u: { email: string }) => u.email));
  const seen = new Set<string>();
  const out: { id: string; name: string; email: string; contact_name: string | null }[] = [];
  for (const c of data ?? []) {
    const email = String(c.contact_email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email) || blocked.has(email)) continue;
    seen.add(email);
    out.push({ id: c.id, name: c.name, email, contact_name: c.contact_name });
  }
  return out;
}

export const getCampaignOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    await assertAdmin(sb, context.userId);
    const [camps, senders, recips, countries, unsubs] = await Promise.all([
      sb.from("email_campaigns").select("*").order("created_at", { ascending: false }),
      sb.from("email_senders").select("*").order("email"),
      sb.from("campaign_recipients").select("campaign_id, status").limit(100000),
      sb.from("clients").select("country").not("country", "is", null),
      sb.from("email_unsubscribes").select("email, reason, created_at").order("created_at", { ascending: false }).limit(500),
    ]);
    const stats: Record<string, CampaignStats> = {};
    for (const r of recips.data ?? []) {
      const s = (stats[r.campaign_id] ??= { total: 0, pending: 0, sent: 0, failed: 0, unsubscribed: 0 });
      s.total++;
      if (r.status === "pending" || r.status === "sending") s.pending++;
      else if (r.status === "sent") s.sent++;
      else if (r.status === "failed") s.failed++;
      else if (r.status === "unsubscribed" || r.status === "skipped") s.unsubscribed++;
    }
    const { sesConfig } = await import("./campaigns.server");
    return {
      campaigns: (camps.data ?? []) as CampaignRow[],
      senders: (senders.data ?? []) as SenderRow[],
      stats,
      countries: [...new Set((countries.data ?? []).map((c) => c.country as string))].sort(),
      unsubscribes: unsubs.data ?? [],
      sesReady: !!sesConfig(),
      sesRegion: process.env.AWS_SES_REGION || "eu-central-1",
    };
  });

export const previewAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => filtersSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const list = await audience(context.supabase, data);
    return { count: list.length, sample: list.slice(0, 8) };
  });

const createSchema = z.object({
  name: z.string().trim().min(1).max(150),
  template_id: z.string().uuid().nullable(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
  filters: filtersSchema,
  daily_limit: z.number().int().min(1).max(20000),
  per_minute: z.number().int().min(1).max(30),
});

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertAdmin(sb, context.userId);
    const list = await audience(sb, data.filters);
    if (!list.length) throw new Error("Pagal filtrus nerasta nė vieno kliento su el. paštu");
    const { data: camp, error } = await sb.from("email_campaigns").insert(data).select("id").single();
    if (error || !camp) throw new Error("Nepavyko sukurti kampanijos");
    for (let i = 0; i < list.length; i += 500) {
      const chunk = list.slice(i, i + 500).map((c) => ({
        campaign_id: camp.id,
        client_id: c.id,
        email: c.email,
        name: c.contact_name ?? c.name,
      }));
      const { error: e } = await sb.from("campaign_recipients").insert(chunk);
      if (e) throw new Error("Nepavyko sudaryti gavėjų sąrašo");
    }
    return { id: camp.id, recipients: list.length };
  });

export const setCampaignStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["running", "paused", "cancelled"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "running") patch.started_at = new Date().toISOString();
    const { error } = await context.supabase.from("email_campaigns").update(patch).eq("id", data.id);
    if (error) throw new Error("Nepavyko pakeisti būsenos");
    return { ok: true };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("email_campaigns")
      .delete()
      .eq("id", data.id)
      .in("status", ["draft", "cancelled", "completed"]);
    if (error) throw new Error("Nepavyko ištrinti");
    return { ok: true };
  });

export const listRecipients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows } = await context.supabase
      .from("campaign_recipients")
      .select("id, email, name, status, sent_at, error, sender_id")
      .eq("campaign_id", data.id)
      .order("sent_at", { ascending: false, nullsFirst: false })
      .limit(300);
    return { recipients: rows ?? [] };
  });

const senderSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().trim().toLowerCase().email().max(200),
  from_name: z.string().trim().min(1).max(80),
  daily_limit: z.number().int().min(1).max(5000),
  is_active: z.boolean(),
});

export const upsertSender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => senderSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...v } = data;
    const res = id
      ? await context.supabase.from("email_senders").update(v).eq("id", id)
      : await context.supabase.from("email_senders").insert(v);
    if (res.error) throw new Error(res.error.code === "23505" ? "Toks siuntėjas jau yra" : "Nepavyko išsaugoti");
    return { ok: true };
  });

export const deleteSender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await context.supabase.from("email_senders").delete().eq("id", data.id);
    return { ok: true };
  });

export const removeUnsubscribe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ email: z.string().max(200) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await context.supabase.from("email_unsubscribes").delete().eq("email", data.email);
    return { ok: true };
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        sender_id: z.string().uuid(),
        to: z.string().trim().email(),
        subject: z.string().min(1).max(200),
        body: z.string().min(1).max(10000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: s } = await context.supabase.from("email_senders").select("*").eq("id", data.sender_id).single();
    if (!s) throw new Error("Siuntėjas nerastas");
    const m = await import("./campaigns.server");
    const vars = { vardas: "Jonas", imone: "Pavyzdinis viešbutis", miestas: "Klaipėda", salis: "Lietuva", objektu_skaicius: 12 };
    const url = `${m.SITE_URL}/atsisakyti?t=test`;
    const { html, text } = m.buildEmail(m.renderText(data.body, vars), url);
    const r = await m.sendViaSes({
      from: `${s.from_name} <${s.email}>`,
      to: data.to,
      subject: "[TESTAS] " + m.renderText(data.subject, vars),
      html,
      text,
      unsubscribeUrl: url,
    });
    if (!r.ok) throw new Error(r.error);
    return { ok: true };
  });

export const runTickNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { processTick } = await import("./campaigns.server");
    return processTick(supabaseAdmin);
  });

/** Viešas: atsisakymas pagal unikalų žetoną iš laiško. */
export const unsubscribeByToken = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin
      .from("campaign_recipients")
      .select("email")
      .eq("unsubscribe_token", data.token)
      .maybeSingle();
    if (!r) return { ok: false };
    await supabaseAdmin.from("email_unsubscribes").upsert({ email: r.email, reason: "unsubscribe" });
    await supabaseAdmin
      .from("campaign_recipients")
      .update({ status: "unsubscribed" })
      .eq("email", r.email)
      .eq("status", "pending");
    return { ok: true };
  });
