import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type ScrapeJob = Database["public"]["Tables"]["scrape_jobs"]["Row"];
export type ScrapeContact = Database["public"]["Tables"]["scrape_contacts"]["Row"];
export type ScrapeLog = Database["public"]["Tables"]["scrape_job_logs"]["Row"];

export const SCRAPE_COUNTRIES: { code: string; label: string; registry: string }[] = [
  { code: "LT", label: "Lietuva", registry: "Lietuva" },
  { code: "IS", label: "Islandija", registry: "Islandija" },
  { code: "LV", label: "Latvija", registry: "Latvija" },
  { code: "EE", label: "Estija", registry: "Estija" },
  { code: "PL", label: "Lenkija", registry: "Lenkija" },
  { code: "DE", label: "Vokietija", registry: "Germany" },
  { code: "NO", label: "Norvegija", registry: "Norvegija" },
  { code: "FI", label: "Suomija", registry: "Suomija" },
  { code: "US", label: "JAV", registry: "USA" },
];

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Neturite teisių");
}

export const getScrapeOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const { data: jobs, error } = await sb.from("scrape_jobs").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error("Nepavyko gauti užduočių");
    const ids = (jobs ?? []).filter((j) => ["running", "paused"].includes(j.status)).map((j) => j.id);
    const queue: Record<string, { queued: number; processing: number }> = {};
    for (const id of ids) {
      const c = async (s: string) => (await sb.from("scrape_sites").select("id", { count: "exact", head: true }).eq("job_id", id).eq("status", s)).count ?? 0;
      queue[id] = { queued: await c("queued"), processing: await c("processing") };
    }
    const { count: total } = await sb.from("scrape_contacts").select("id", { count: "exact", head: true });
    return { jobs: (jobs ?? []) as ScrapeJob[], queue, totalContacts: total ?? 0, webSearchReady: !!process.env["FIRECRAWL_API_KEY"] };
  });

export const getScrapeJobDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const [logs, contacts, failed] = await Promise.all([
      sb.from("scrape_job_logs").select("*").eq("job_id", data.jobId).order("created_at", { ascending: false }).limit(60),
      sb.from("scrape_contacts").select("*").eq("job_id", data.jobId).order("created_at", { ascending: false }).limit(1000),
      sb.from("scrape_sites").select("domain,error,attempts").eq("job_id", data.jobId).eq("status", "failed").limit(50),
    ]);
    return { logs: (logs.data ?? []) as ScrapeLog[], contacts: (contacts.data ?? []) as ScrapeContact[], failed: failed.data ?? [] };
  });

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  target: z.number().int().min(1).max(20000),
  countries: z.array(z.string().length(2)).min(1).max(10),
  city: z.string().trim().max(80).nullable(),
  category: z.enum(["accommodation", "hotel", "apartment", "guest_house", "boutique_hotel", "hostel", "motel", "cabin", "camping", "farm_stay", "villa"]),
  phrases: z.array(z.string().trim().min(2).max(120)).max(20),
  startUrls: z.array(z.string().trim().max(300)).max(2000),
  maxPages: z.number().int().min(1).max(20),
  rescan: z.boolean(),
  contactTypes: z.array(z.enum(["all", "general", "booking", "sales", "other"])).min(1),
});

export const createScrapeJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.input<typeof createSchema>) => createSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase.from("scrape_jobs").insert({
      name: data.name, target: data.target, countries: data.countries, city: data.city || null,
      category: data.category, phrases: data.phrases, start_urls: data.startUrls, max_pages: data.maxPages,
      rescan: data.rescan, contact_types: data.contactTypes, status: "running", created_by: context.userId,
    }).select("id").single();
    if (error || !row) throw new Error("Nepavyko sukurti užduoties");
    await context.supabase.from("scrape_job_logs").insert({ job_id: row.id, message: `Užduotis pradėta: tikslas ${data.target} kontaktų` });
    return { id: row.id };
  });

export const controlScrapeJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { jobId: string; action: "pause" | "resume" | "stop" | "retry" }) =>
    z.object({ jobId: z.string().uuid(), action: z.enum(["pause", "resume", "stop", "retry"]) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const { data: job } = await sb.from("scrape_jobs").select("status,new_count,target").eq("id", data.jobId).single();
    if (!job) throw new Error("Užduotis nerasta");
    const now = new Date().toISOString();
    const msg: Record<string, string> = { pause: "Pristabdyta", resume: "Tęsiama", stop: "Sustabdyta", retry: "Pakartojamos nepavykusios svetainės" };
    if (data.action === "pause") await sb.from("scrape_jobs").update({ status: "paused" }).eq("id", data.jobId);
    if (data.action === "stop") await sb.from("scrape_jobs").update({ status: "stopped", finished_at: now, status_reason: `Sustabdyta rankiniu būdu (${job.new_count}/${job.target})` }).eq("id", data.jobId);
    if (data.action === "resume" || data.action === "retry") {
      if (job.new_count >= job.target) throw new Error("Tikslas jau pasiektas");
      if (data.action === "retry") await sb.from("scrape_sites").update({ status: "queued", attempts: 0, next_attempt_at: now, error: null }).eq("job_id", data.jobId).eq("status", "failed");
      // resuming an exhausted job re-checks discovery sources
      const patch: Record<string, unknown> = { status: "running", finished_at: null, status_reason: null };
      if (job.status === "exhausted") patch["discovery"] = {};
      await sb.from("scrape_jobs").update(patch as never).eq("id", data.jobId);
    }
    await sb.from("scrape_job_logs").insert({ job_id: data.jobId, message: msg[data.action]! });
    return { ok: true };
  });

export const importScrapedContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const { data: rows } = await sb.from("scrape_contacts").select("*").eq("job_id", data.jobId).is("imported_client_id", null).limit(5000);
    const reg = (code: string | null) => SCRAPE_COUNTRIES.find((c) => c.code === code)?.registry ?? code;
    let imported = 0;
    let skipped = 0;
    for (const c of rows ?? []) {
      const { data: exists } = await sb.from("clients").select("id").ilike("contact_email", c.email).limit(1);
      if (exists?.length) {
        await sb.from("scrape_contacts").update({ imported_client_id: exists[0]!.id }).eq("id", c.id);
        skipped++;
        continue;
      }
      const { data: client, error } = await sb.from("clients").insert({
        name: c.company_name || c.domain || c.email, contact_email: c.email, country: reg(c.country), city: c.city,
        website_url: c.domain ? `https://${c.domain}` : null, status: "lead", notes: c.source_url ? `Šaltinis: ${c.source_url}` : null,
      }).select("id").single();
      if (error || !client) { skipped++; continue; }
      await sb.from("scrape_contacts").update({ imported_client_id: client.id }).eq("id", c.id);
      imported++;
    }
    return { imported, skipped };
  });
