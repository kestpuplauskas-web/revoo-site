import { htmlToText, toEmailHtml } from "./email-html";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Admin = SupabaseClient<Database>;

export const SITE_URL = "https://revoostay.com";
const MAX_PER_TICK = 60;

/** Siuntimo kanalas: Resend. */
export function sesConfig() {
  return process.env["RESEND_API_KEY"] ? { provider: "resend" as const } : null;
}

export function vilniusToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vilnius" }).format(new Date());
}

export type MergeVars = {
  vardas?: string | null;
  imone?: string | null;
  miestas?: string | null;
  salis?: string | null;
  objektu_skaicius?: string | number | null;
};

/** {{kintamasis}} pakeitimas, tada {variantas|kitas} atsitiktinis parinkimas. */
export function renderText(text: string, vars: MergeVars): string {
  const withVars = text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => {
    const v = vars[key.toLowerCase() as keyof MergeVars];
    return v === null || v === undefined ? "" : String(v);
  });
  return withVars.replace(/\{([^{}]*\|[^{}]*)\}/g, (_, group: string) => {
    const opts = group.split("|");
    return opts[Math.floor(Math.random() * opts.length)] ?? "";
  });
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildEmail(body: string, unsubscribeUrl: string) {
  const content = toEmailHtml(body);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>p{margin:0 0 14px}ul,ol{margin:0 0 14px;padding-left:24px}</style></head><body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1f2a2a">${content}<p style="margin-top:28px;font-size:12px;color:#7a8585">Nenorite gauti laiškų? <a href="${esc(unsubscribeUrl)}" style="color:#7a8585">Atsisakyti</a></p></body></html>`;
  const text = `${htmlToText(content)}\n\n—\nAtsisakyti: ${unsubscribeUrl}`;
  return { html, text };
}

export async function sendViaSes(args: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return { ok: false, error: "Resend raktas nenustatytas" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: args.from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
      headers: {
        "List-Unsubscribe": `<${args.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  const raw = await res.text();
  if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${raw.slice(0, 300)}` };
  try {
    return { ok: true, messageId: (JSON.parse(raw) as { id?: string }).id ?? "" };
  } catch {
    return { ok: true, messageId: "" };
  }
}

type Sender = Database["public"]["Tables"]["email_senders"]["Row"];

/** Vienas siuntimo ciklas: kiekvienai vykdomai kampanijai išsiunčia iki per_minute laiškų. */
export async function processTick(admin: Admin) {
  const today = vilniusToday();
  const summary = { sent: 0, failed: 0, skipped: 0, note: "" as string };
  if (!sesConfig()) {
    summary.note = "Resend nenustatytas";
    return summary;
  }

  await admin.from("campaign_runtime").update({ last_tick_at: new Date().toISOString() }).eq("singleton", true);

  const { data: campaigns } = await admin.from("email_campaigns").select("*").eq("status", "running");
  if (!campaigns?.length) return summary;

  const { data: sendersRaw } = await admin.from("email_senders").select("*").eq("is_active", true);
  const senders: (Sender & { lastSentMs: number })[] = [];
  for (const s of sendersRaw ?? []) {
    const { data: last } = await admin
      .from("campaign_recipients")
      .select("sent_at")
      .eq("sender_id", s.id)
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1);
    const lastSentMs = last?.[0]?.sent_at ? new Date(last[0].sent_at).getTime() : 0;
    senders.push({ ...(s.sent_day === today ? s : { ...s, sent_today: 0, sent_day: today }), lastSentMs });
  }
  if (!senders.length) {
    summary.note = "Nėra aktyvių siuntėjų";
    return summary;
  }

  const now = Date.now();
  // Intervalas: nuo per_minute iki interval_max_minutes min.; kitas laikas parenkamas atsitiktinai su sekundėmis.
  let eligible: typeof senders = [];
  let rangeMin = 1;
  let rangeMax = 1;
  const pickSender = () => {
    const avail = eligible.filter((s) => s.sent_today < s.daily_limit);
    if (!avail.length) return null;
    avail.sort((a, b) => a.sent_today / a.daily_limit - b.sent_today / b.daily_limit);
    const chosen = avail[0];
    if (!chosen) return null;
    eligible = eligible.filter((s) => s !== chosen);
    chosen.lastSentMs = now;
    const delayMs = Math.round((rangeMin + Math.random() * (rangeMax - rangeMin)) * 60000);
    const next = new Date(now + delayMs).toISOString();
    chosen.next_send_at = next;
    void admin.from("email_senders").update({ next_send_at: next }).eq("id", chosen.id);
    return chosen;
  };

  let budget = MAX_PER_TICK;
  for (const c of campaigns) {
    if (budget <= 0) break;
    const sentToday = c.sent_day === today ? c.sent_today : 0;
    rangeMin = Math.max(1, c.per_minute);
    rangeMax = Math.max(rangeMin, c.interval_max_minutes ?? rangeMin);
    const fixedMs = rangeMin * 60000 - 20000;
    eligible = senders.filter((s) => {
      if (s.sent_today >= s.daily_limit) return false;
      if (s.next_send_at) return now >= new Date(s.next_send_at).getTime() - 5000;
      return now - s.lastSentMs >= fixedMs;
    });
    const allowed = Math.min(eligible.length, c.daily_limit - sentToday, budget);
    if (allowed <= 0) continue;

    const { data: batch } = await admin
      .from("campaign_recipients")
      .select("*")
      .eq("campaign_id", c.id)
      .eq("status", "pending")
      .order("created_at")
      .limit(allowed);

    if (!batch?.length) {
      const { count } = await admin
        .from("campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", c.id)
        .in("status", ["pending", "sending"]);
      if (!count) {
        await admin
          .from("email_campaigns")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", c.id);
      }
      continue;
    }

    const clientIds = batch.map((r) => r.client_id).filter((x): x is string => !!x);
    const { data: clients } = clientIds.length
      ? await admin
          .from("clients")
          .select("id, name, company_name, contact_name, city, country, units_count")
          .in("id", clientIds)
      : { data: [] };
    const clientMap = new Map((clients ?? []).map((cl) => [cl.id, cl]));
    const { data: unsubs } = await admin
      .from("email_unsubscribes")
      .select("email")
      .in("email", batch.map((r) => r.email));
    const unsubSet = new Set((unsubs ?? []).map((u) => u.email));

    let campaignSent = 0;
    for (const r of batch) {
      if (unsubSet.has(r.email)) {
        await admin.from("campaign_recipients").update({ status: "unsubscribed" }).eq("id", r.id);
        summary.skipped++;
        continue;
      }
      const sender = pickSender();
      if (!sender) {
        summary.note = "Visų siuntėjų dienos limitai išnaudoti";
        break;
      }
      const { data: claimed } = await admin
        .from("campaign_recipients")
        .update({ status: "sending", sender_id: sender.id })
        .eq("id", r.id)
        .eq("status", "pending")
        .select("id");
      if (!claimed?.length) continue;

      const cl = r.client_id ? clientMap.get(r.client_id) : undefined;
      const vars: MergeVars = {
        vardas: cl?.contact_name?.split(" ")[0] ?? r.name ?? "",
        imone: cl?.company_name || cl?.name || "",
        miestas: cl?.city ?? "",
        salis: cl?.country ?? "",
        objektu_skaicius: cl?.units_count ?? "",
      };
      const unsubscribeUrl = `${SITE_URL}/atsisakyti?t=${r.unsubscribe_token}`;
      const { html, text } = buildEmail(renderText(c.body, vars), unsubscribeUrl);
      const result = await sendViaSes({
        from: `${sender.from_name} <${sender.email}>`,
        to: r.email,
        subject: renderText(c.subject, vars),
        html,
        text,
        unsubscribeUrl,
      });

      sender.sent_today++;
      sender.sent_day = today;
      budget--;
      if (result.ok) {
        campaignSent++;
        summary.sent++;
        await admin
          .from("campaign_recipients")
          .update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: result.messageId, error: null })
          .eq("id", r.id);
        if (r.client_id) {
          await admin.from("client_activities").insert({
            client_id: r.client_id,
            kind: "system",
            activity_type: "email",
            field: "campaign",
            new_value: `Kampanija „${c.name}“ — išsiųsta iš ${sender.email}`,
            template_id: c.template_id,
          });
        }
      } else {
        summary.failed++;
        await admin.from("campaign_recipients").update({ status: "failed", error: result.error }).eq("id", r.id);
      }
    }

    await admin
      .from("email_campaigns")
      .update({ sent_today: sentToday + campaignSent, sent_day: today })
      .eq("id", c.id);
  }

  for (const s of senders) {
    await admin.from("email_senders").update({ sent_today: s.sent_today, sent_day: s.sent_day }).eq("id", s.id);
  }
  return summary;
}
