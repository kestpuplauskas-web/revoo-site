// Background contact-collection worker. Called by the minute tick route only.
import {
  classifyEmail,
  confidenceFor,
  extractEmails,
  findPriorityLinks,
  matchesTypes,
  normalizeDomain,
  robotsDisallowsAll,
} from "./scrape-extract";

type Sb = any;
type Job = {
  id: string; target: number; countries: string[]; city: string | null; category: string;
  phrases: string[]; start_urls: string[]; max_pages: number; rescan: boolean;
  contact_types: string[]; discovery: Discovery; new_count: number;
};
type Discovery = { urlsDone?: boolean; osmDone?: string[]; osmFailed?: Record<string, number>; webIdx?: number; webDone?: boolean };
type Site = { id: string; job_id: string; domain: string; url: string; company_name: string | null; country: string | null; city: string | null; known_email: string | null; attempts: number };

const UA = "RevooContactBot/1.0 (+https://revoostay.com)";
const TICK_BUDGET_MS = 40_000;
const QUEUE_LOW = 25;

export const CATEGORY_OSM: Record<string, string> = {
  accommodation: `["tourism"~"^(hotel|guest_house|apartment|hostel|motel|chalet|camp_site)$"]`,
  hotel: `["tourism"="hotel"]`,
  apartment: `["tourism"="apartment"]`,
  guest_house: `["tourism"="guest_house"]`,
  car_rental: `["amenity"="car_rental"]`,
  restaurant: `["amenity"="restaurant"]`,
};

async function log(sb: Sb, jobId: string, level: string, message: string) {
  await sb.from("scrape_job_logs").insert({ job_id: jobId, level, message: message.slice(0, 500) });
}

async function fetchText(url: string, timeoutMs = 8000, maxBytes = 1_500_000): Promise<{ ok: boolean; status: number; text: string; finalUrl: string }> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
  const finalHost = normalizeDomain(res.url || url);
  if (!finalHost) return { ok: false, status: 0, text: "", finalUrl: url };
  const ct = res.headers.get("content-type") ?? "";
  if (!res.ok || (ct && !/text|html|xml/i.test(ct))) {
    await res.body?.cancel().catch(() => {});
    return { ok: false, status: res.status, text: "", finalUrl: res.url };
  }
  const reader = res.body?.getReader();
  if (!reader) return { ok: true, status: res.status, text: await res.text(), finalUrl: res.url };
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
    if (size > maxBytes) { await reader.cancel().catch(() => {}); break; }
  }
  const buf = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) { buf.set(c.subarray(0, Math.min(c.length, size - off)), off); off += c.length; if (off >= size) break; }
  return { ok: true, status: res.status, text: new TextDecoder().decode(buf), finalUrl: res.url };
}

const mxCache = new Map<string, string>();
async function mxStatus(domain: string): Promise<string> {
  if (mxCache.has(domain)) return mxCache.get(domain)!;
  let status = "unknown";
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(4000) });
    if (r.ok) {
      const j = (await r.json()) as { Status: number; Answer?: unknown[] };
      status = j.Status === 0 && (j.Answer?.length ?? 0) > 0 ? "ok" : j.Status === 3 || j.Status === 0 ? "none" : "unknown";
    }
  } catch { /* keep unknown */ }
  mxCache.set(domain, status);
  return status;
}

// ---------- discovery ----------
type Found = { domain: string; url: string; name: string | null; country: string | null; city: string | null; email: string | null; source: string };

const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

async function cityBox(city: string, country: string): Promise<string | null> {
  const u = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&countrycodes=${country.toLowerCase()}&format=json&limit=1`;
  const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) return null;
  const j = (await r.json()) as { boundingbox?: string[] }[];
  const b = j[0]?.boundingbox;
  return b && b.length === 4 ? `(${b[0]},${b[2]},${b[1]},${b[3]})` : null;
}

async function discoverOsm(job: Job, country: string): Promise<Found[]> {
  const tag = CATEGORY_OSM[job.category] ?? CATEGORY_OSM["accommodation"]!;
  let scope = `area["ISO3166-1"="${country}"][admin_level=2]->.a;nwr(area.a)`;
  if (job.city) {
    const box = await cityBox(job.city, country);
    if (!box) throw new Error(`Miestas „${job.city}“ nerastas žemėlapyje`);
    scope = `nwr${box}`;
  }
  const q = `[out:json][timeout:50];${scope}${tag}[~"^(website|contact:website|url)$"~"."];out tags center 4000;`;
  let res: Response | null = null;
  let lastErr = "";
  for (const ep of OVERPASS) {
    try {
      res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
        body: `data=${encodeURIComponent(q)}`,
        signal: AbortSignal.timeout(50_000),
      });
      if (res.ok) break;
      lastErr = `atsakė ${res.status}`;
      res = null;
    } catch (e) {
      lastErr = (e as Error).name === "TimeoutError" ? "per ilgai neatsakė" : (e as Error).message;
    }
  }
  if (!res) throw new Error(`OpenStreetMap ${lastErr}`);
  const data = (await res.json()) as { elements: { tags?: Record<string, string> }[] };
  const out: Found[] = [];
  for (const el of data.elements ?? []) {
    const t = el.tags ?? {};
    const w = t["website"] ?? t["contact:website"] ?? t["url"];
    const domain = w ? normalizeDomain(w) : null;
    if (!domain || /facebook\.com|instagram\.com|booking\.com|airbnb\./.test(domain)) continue;
    out.push({
      domain, url: /^https?:/i.test(w!) ? w! : `https://${w}`,
      name: t["name"] ?? null, country, city: t["addr:city"] ?? job.city ?? null,
      email: (t["email"] ?? t["contact:email"] ?? null)?.split(/[;,\s]/)[0]?.toLowerCase() ?? null, source: "osm",
    });
  }
  return out;
}

async function discoverWeb(job: Job, phrase: string): Promise<Found[]> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) return [];
  const gateway = key.startsWith("lovc_");
  const url = gateway ? "https://connector-gateway.lovable.dev/firecrawl/v2/search" : "https://api.firecrawl.dev/v2/search";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (gateway) { headers["Authorization"] = `Bearer ${process.env["LOVABLE_API_KEY"] ?? ""}`; headers["X-Connection-Api-Key"] = key; }
  else headers["Authorization"] = `Bearer ${key}`;
  const where = [job.city, ...job.countries].filter(Boolean).join(" ");
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ query: `${phrase} ${where}`.trim(), limit: 30 }), signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Paieška internete atsakė ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { data?: { web?: { url: string; title?: string }[] } | { url: string; title?: string }[] };
  const items = Array.isArray(j.data) ? j.data : (j.data?.web ?? []);
  const out: Found[] = [];
  for (const it of items) {
    const domain = normalizeDomain(it.url);
    if (!domain || /facebook|instagram|booking\.com|airbnb|tripadvisor|expedia|google\.|wikipedia|youtube/.test(domain)) continue;
    out.push({ domain, url: `https://${domain}/`, name: it.title?.slice(0, 120) ?? null, country: job.countries[0] ?? null, city: job.city, email: null, source: "web" });
  }
  return out;
}

async function enqueue(sb: Sb, job: Job, found: Found[]): Promise<number> {
  const uniq = new Map<string, Found>();
  for (const f of found) if (!uniq.has(f.domain)) uniq.set(f.domain, f);
  let list = [...uniq.values()];
  if (!job.rescan && list.length) {
    const done = new Set<string>();
    for (let i = 0; i < list.length; i += 200) {
      const { data } = await sb.from("scrape_sites").select("domain").in("domain", list.slice(i, i + 200).map((f) => f.domain)).neq("job_id", job.id).in("status", ["done", "skipped"]);
      for (const r of data ?? []) done.add(r.domain);
    }
    list = list.filter((f) => !done.has(f.domain));
  }
  let added = 0;
  for (let i = 0; i < list.length; i += 300) {
    const rows = list.slice(i, i + 300).map((f) => ({ job_id: job.id, domain: f.domain, url: f.url, company_name: f.name, country: f.country, city: f.city, known_email: f.email, source: f.source }));
    const { data, error } = await sb.from("scrape_sites").upsert(rows, { onConflict: "job_id,domain", ignoreDuplicates: true }).select("id");
    if (error) throw new Error(error.message);
    added += data?.length ?? 0;
  }
  return added;
}

/** Returns true when every configured source is exhausted. */
async function runDiscovery(sb: Sb, job: Job): Promise<boolean> {
  const d: Discovery = { ...job.discovery };
  try {
    if (!d.urlsDone) {
      d.urlsDone = true;
      const found = job.start_urls.map((u) => normalizeDomain(u)).filter(Boolean).map((domain) => ({ domain: domain!, url: `https://${domain}/`, name: null, country: job.countries[0] ?? null, city: job.city, email: null, source: "user" }));
      if (found.length) { const n = await enqueue(sb, job, found); await log(sb, job.id, "info", `Įtraukta ${n} jūsų pateiktų svetainių`); }
    } else {
      const next = job.countries.find((c) => !(d.osmDone ?? []).includes(c));
      if (next && CATEGORY_OSM[job.category]) {
        try {
          const found = await discoverOsm(job, next);
          const n = await enqueue(sb, job, found);
          d.osmDone = [...(d.osmDone ?? []), next];
          await log(sb, job.id, "info", `OpenStreetMap (${next}): rasta ${found.length} įmonių su svetainėmis, nauja eilėje ${n}`);
        } catch (e) {
          const fails = (d.osmFailed?.[next] ?? 0) + 1;
          d.osmFailed = { ...(d.osmFailed ?? {}), [next]: fails };
          if (fails >= 3) d.osmDone = [...(d.osmDone ?? []), next];
          await log(sb, job.id, "warn", `OpenStreetMap (${next}) nepavyko: ${(e as Error).message}${fails >= 3 ? " – šaltinis praleidžiamas" : " – bus bandoma vėl"}`);
        }
      } else if (!d.webDone) {
        if (!process.env["FIRECRAWL_API_KEY"] || job.phrases.length === 0) {
          d.webDone = true;
          if (job.phrases.length && !process.env["FIRECRAWL_API_KEY"]) await log(sb, job.id, "warn", "Paieška internete pagal frazes neprijungta – naudojami tik kiti šaltiniai");
        } else {
          const idx = d.webIdx ?? 0;
          const phrase = job.phrases[idx]!;
          const found = await discoverWeb(job, phrase);
          const n = await enqueue(sb, job, found);
          d.webIdx = idx + 1;
          if (d.webIdx >= job.phrases.length) d.webDone = true;
          await log(sb, job.id, "info", `Paieška „${phrase}“: nauja eilėje ${n}`);
        }
      }
    }
  } catch (e) {
    await log(sb, job.id, "error", `Šaltinio klaida: ${(e as Error).message}`);
    d.webDone = d.webDone || (d.webIdx ?? 0) >= job.phrases.length;
  }
  await sb.from("scrape_jobs").update({ discovery: d, last_activity_at: new Date().toISOString() }).eq("id", job.id);
  job.discovery = d;
  const osmLeft = CATEGORY_OSM[job.category] ? job.countries.some((c) => !(d.osmDone ?? []).includes(c)) : false;
  return !!d.urlsDone && !osmLeft && !!d.webDone;
}

// ---------- site processing ----------
async function processSite(sb: Sb, job: Job, site: Site, category: string) {
  const base = `https://${site.domain}/`;
  try {
    const robots = await fetchText(`${base}robots.txt`, 4000, 100_000).catch(() => null);
    if (robots?.ok && robotsDisallowsAll(robots.text)) {
      await sb.from("scrape_sites").update({ status: "skipped", error: "robots.txt draudžia", processed_at: new Date().toISOString(), locked_until: null }).eq("id", site.id);
      return;
    }
    let home = await fetchText(site.url.startsWith("http") ? site.url : base).catch(() => null);
    if (!home?.ok) home = await fetchText(base).catch(() => null);
    if (!home?.ok) home = await fetchText(`http://${site.domain}/`).catch(() => null);
    if (!home?.ok) throw new Error(`Svetainė nepasiekiama${home?.status ? ` (${home.status})` : ""}`);

    const pages: { url: string; html: string }[] = [{ url: home.finalUrl, html: home.text }];
    const links = findPriorityLinks(home.text, home.finalUrl, site.domain, Math.max(0, job.max_pages - 1));
    const extra = await Promise.allSettled(links.map((l) => fetchText(l, 6000)));
    extra.forEach((r, i) => { if (r.status === "fulfilled" && r.value.ok) pages.push({ url: links[i]!, html: r.value.text }); });

    const emails = new Map<string, string>();
    if (site.known_email) emails.set(site.known_email, `https://www.openstreetmap.org/ (${site.domain})`);
    for (const p of pages) for (const e of extractEmails(p.html)) if (!emails.has(e)) emails.set(e, p.url);

    let found = 0;
    for (const [email, source] of emails) {
      const type = classifyEmail(email);
      if (!matchesTypes(type, job.contact_types)) {
        await sb.from("scrape_jobs").update({ rejected_count: (await sb.from("scrape_jobs").select("rejected_count").eq("id", job.id).single()).data.rejected_count + 1 }).eq("id", job.id);
        continue;
      }
      const domain = email.split("@")[1]!;
      const mx = await mxStatus(domain);
      if (mx === "none") continue;
      const { data: res } = await sb.rpc("scrape_add_contact", {
        _job: job.id, _email: email, _company: site.company_name, _domain: site.domain, _country: site.country, _city: site.city,
        _category: category, _type: type, _source: source, _mx: mx, _confidence: confidenceFor(email, site.domain, mx),
      });
      if (res === "new") found++;
      if (res === "full" || res === "stopped") break;
    }
    await sb.from("scrape_sites").update({ status: "done", emails_found: found, processed_at: new Date().toISOString(), locked_until: null, error: emails.size === 0 ? "El. pašto nerasta" : null }).eq("id", site.id);
  } catch (e) {
    const msg = (e as Error).name === "TimeoutError" ? "Baigėsi laukimo laikas" : (e as Error).message;
    const final = site.attempts >= 3;
    await sb.from("scrape_sites").update({
      status: final ? "failed" : "queued", error: msg.slice(0, 300), locked_until: null,
      next_attempt_at: new Date(Date.now() + 2 ** site.attempts * 60_000).toISOString(),
      processed_at: final ? new Date().toISOString() : null,
    }).eq("id", site.id);
  }
}

async function refreshCounters(sb: Sb, jobId: string) {
  const c = async (status: string[]) => (await sb.from("scrape_sites").select("id", { count: "exact", head: true }).eq("job_id", jobId).in("status", status)).count ?? 0;
  const [done, failed, all] = await Promise.all([c(["done", "skipped"]), c(["failed"]), c(["queued", "processing", "done", "skipped", "failed"])]);
  await sb.from("scrape_jobs").update({ sites_done: done, sites_failed: failed, discovered_count: all }).eq("id", jobId);
  return { open: all - done - failed };
}

export async function processScrapeTick(sb: Sb) {
  const started = Date.now();
  const { data: jobs } = await sb.from("scrape_jobs").select("*").eq("status", "running");
  if (!jobs?.length) return { jobs: 0 };
  const byId = new Map<string, Job>(jobs.map((j: Job) => [j.id, j]));

  // Discovery when the queue runs low.
  const exhausted = new Map<string, boolean>();
  for (const job of jobs as Job[]) {
    const { count } = await sb.from("scrape_sites").select("id", { count: "exact", head: true }).eq("job_id", job.id).in("status", ["queued", "processing"]);
    if ((count ?? 0) < QUEUE_LOW) exhausted.set(job.id, await runDiscovery(sb, job));
  }

  let processed = 0;
  while (Date.now() - started < TICK_BUDGET_MS - 12_000) {
    const { data: sites } = await sb.rpc("scrape_claim_sites", { _limit: 8 });
    if (!sites?.length) break;
    await Promise.allSettled((sites as Site[]).map((s) => { const j = byId.get(s.job_id); return j ? processSite(sb, j, s, j.category) : Promise.resolve(); }));
    processed += sites.length;
  }

  for (const job of jobs as Job[]) {
    const { open } = await refreshCounters(sb, job.id);
    const { data: fresh } = await sb.from("scrape_jobs").select("status,new_count,target").eq("id", job.id).single();
    if (fresh?.status === "running" && open === 0 && exhausted.get(job.id)) {
      await sb.from("scrape_jobs").update({
        status: "exhausted", finished_at: new Date().toISOString(),
        status_reason: `Šaltiniai išseko: surinkta ${fresh.new_count} iš ${fresh.target}. Pridėkite daugiau šalių, frazių ar savo svetainių sąrašą ir tęskite.`,
      }).eq("id", job.id);
      await log(sb, job.id, "warn", `Tikslas nepasiektas – šaltiniai išseko (${fresh.new_count}/${fresh.target})`);
    } else if (fresh?.status === "completed") {
      await sb.from("scrape_sites").update({ status: "skipped", error: "Tikslas pasiektas", locked_until: null }).eq("job_id", job.id).eq("status", "queued");
    }
  }
  return { jobs: jobs.length, processed };
}
