import { AwsClient } from "aws4fetch";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Admin = SupabaseClient<Database>;

export const SITE_URL = "https://revoo.site";
const MAX_PER_TICK = 60;

export function sesConfig() {
  const accessKeyId = process.env["AWS_SES_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["AWS_SES_SECRET_ACCESS_KEY"];
  const region = process.env["AWS_SES_REGION"] || "eu-central-1";
  if (!accessKeyId || !secretAccessKey) return null;
  return { accessKeyId, secretAccessKey, region };
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
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1f2a2a">${esc(
    body,
  )
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("")}<p style="margin-top:28px;font-size:12px;color:#7a8585">Nenorite gauti laiškų? <a href="${unsubscribeUrl}" style="color:#7a8585">Atsisakyti</a></p></body></html>`;
  const text = `${body}\n\n—\nAtsisakyti: ${unsubscribeUrl}`;
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
  const cfg = sesConfig();
  if (!cfg) return { ok: false, error: "Amazon SES raktai nenustatyti" };
  const aws = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    region: cfg.region,
    service: "ses",
  });
  const res = await aws.fetch(`https://email.${cfg.region}.amazonaws.com/v2/email/outbound-emails`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      FromEmailAddress: args.from,
      Destination: { ToAddresses: [args.to] },
      Content: {
        Simple: {
          Subject: { Data: args.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: args.html, Charset: "UTF-8" },
            Text: { Data: args.text, Charset: "UTF-8" },
          },
          Headers: [
            { Name: "List-Unsubscribe", Value: `<${args.unsubscribeUrl}>` },
            { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
          ],
        },
      },
    }),
  });
  const raw = await res.text();
  if (!res.ok) return { ok: false, error: `SES ${res.status}: ${raw.slice(0, 300)}` };
  try {
    return { ok: true, messageId: (JSON.parse(raw) as { MessageId?: string }).MessageId ?? "" };
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
    summary.note = "SES nenustatytas";
    return summary;
  }

  await admin.from("campaign_runtime").update({ last_tick_at: new Date().toISOString() }).eq("singleton", true);

  const { data: campaigns } = await admin.from("email_campaigns").select("*").eq("status", "running");
  if (!campaigns?.length) return summary;

  const { data: sendersRaw } = await admin.from("email_senders").select("*").eq("is_active", true);
  const senders: Sender[] = (sendersRaw ?? []).map((s) =>
    s.sent_day === today ? s : { ...s, sent_today: 0, sent_day: today },
  );
  if (!senders.length) {
    summary.note = "Nėra aktyvių siuntėjų";
    return summary;
  }

  const pickSender = () => {
    const avail = senders.filter((s) => s.sent_today < s.daily_limit);
    if (!avail.length) return null;
    avail.sort((a, b) => a.sent_today / a.daily_limit - b.sent_today / b.daily_limit);
    return avail[0];
  };

  let budget = MAX_PER_TICK;
  for (const c of campaigns) {
    if (budget <= 0) break;
    const sentToday = c.sent_day === today ? c.sent_today : 0;
    const allowed = Math.min(c.per_minute, c.daily_limit - sentToday, budget);
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
