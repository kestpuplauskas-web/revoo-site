// Pure, deterministic helpers for the contact scraper (no I/O).

export type ContactType = "general" | "booking" | "sales" | "other";

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi;
const BAD_TLD = /\.(png|jpe?g|gif|webp|svg|css|js|ico|bmp|tiff?|avif|mp4|pdf)$/i;
const BAD_DOMAINS = [
  "example.com", "example.org", "domain.com", "email.com", "sentry.io", "wixpress.com",
  "sentry-next.wixpress.com", "godaddy.com", "yourdomain.com", "test.com", "schema.org",
];
const BAD_LOCAL = /^(noreply|no-reply|donotreply|do-not-reply|postmaster|abuse|webmaster|mailer-daemon|privacy|gdpr|dpo|unsubscribe)$/i;

export function isValidEmailSyntax(email: string): boolean {
  if (email.length > 254) return false;
  const [local, domain] = email.split("@");
  if (!local || !domain || local.length > 64) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (!/^[a-z0-9.-]+\.[a-z]{2,24}$/i.test(domain) || domain.includes("..")) return false;
  return true;
}

function decodeEntities(s: string) {
  return s
    .replace(/&#64;|&commat;/gi, "@")
    .replace(/&#46;|&period;/gi, ".")
    .replace(/%40/g, "@")
    .replace(/\s*\[\s*at\s*\]\s*|\s*\(\s*at\s*\)\s*/gi, "@")
    .replace(/\s*\[\s*dot\s*\]\s*|\s*\(\s*dot\s*\)\s*/gi, ".");
}

/** Decode Cloudflare `data-cfemail` / `/cdn-cgi/l/email-protection#hex` XOR-encoded emails. */
export function decodeCfEmail(hex: string): string | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length < 4 || hex.length % 2) return null;
  const key = parseInt(hex.slice(0, 2), 16);
  let s = "";
  for (let i = 2; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return s.includes("@") ? s : null;
}

/** Reveal common hidden-email tricks so the regular matcher can find them. */
export function deobfuscateEmails(html: string): string {
  const extra: string[] = [];
  for (const m of html.matchAll(/data-cfemail=["']([0-9a-fA-F]+)["']/g)) {
    const d = decodeCfEmail(m[1] ?? ""); if (d) extra.push(d);
  }
  for (const m of html.matchAll(/email-protection#([0-9a-fA-F]+)/g)) {
    const d = decodeCfEmail(m[1] ?? ""); if (d) extra.push(d);
  }
  let t = decodeEntities(html);
  try { t = t.replace(/mailto:([^"'\s>]+)/gi, (_, a) => `mailto:${decodeURIComponent(a)}`); } catch { /* ignore */ }
  // "info [at] hotel [dot] com", "info(at)hotel(dot)com", "info at hotel dot com"
  t = t
    .replace(/\s*[[({]\s*(?:at|eta|@)\s*[\])}]\s*/gi, "@")
    .replace(/\s*[[({]\s*(?:dot|taškas|punktas|\.)\s*[\])}]\s*/gi, ".")
    .replace(/([a-z0-9._-]+)\s+(?:at)\s+([a-z0-9-]+)\s+(?:dot)\s+([a-z]{2,})/gi, "$1@$2.$3");
  return `${t}\n${extra.join("\n")}`;
}

export function extractEmails(html: string): string[] {
  const text = deobfuscateEmails(html);
  const out = new Set<string>();
  for (const m of text.matchAll(EMAIL_RE)) {
    const e = m[0].toLowerCase().replace(/^[._-]+|[._-]+$/g, "");
    if (BAD_TLD.test(e)) continue;
    const [local, domain] = e.split("@");
    if (!local || !domain) continue;
    if (BAD_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) continue;
    if (BAD_LOCAL.test(local)) continue;
    if (/^[0-9a-f]{16,}$/.test(local)) continue; // tracking hashes
    if (!isValidEmailSyntax(e)) continue;
    out.add(e);
  }
  return [...out];
}

export function classifyEmail(email: string): ContactType {
  const local = email.split("@")[0] ?? "";
  if (/(book|reserv|rezerv|booking|bokun|boka|stay|frontdesk|reception|registur)/.test(local)) return "booking";
  if (/(sales|pardav|sala|commercial|marketing|partner)/.test(local)) return "sales";
  if (/^(info|hello|contact|kontakt|office|mail|hi|admin|team|labas|post|hotel|desk)/.test(local)) return "general";
  return "other";
}

export function matchesTypes(type: ContactType, wanted: string[]): boolean {
  if (wanted.length === 0 || wanted.includes("all")) return true;
  return wanted.includes(type);
}

export function normalizeDomain(input: string): string | null {
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes(".") || isBlockedHost(host)) return null;
    return host;
  } catch {
    return null;
  }
}

// SSRF guard: reject IPs, local and internal names.
export function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^\d+(\.\d+){3}$/.test(h)) return true; // any literal IPv4
  if (h.includes(":")) return true; // IPv6 literal
  if (!/^[a-z0-9.-]+$/.test(h)) return true;
  return false;
}

const PRIORITY_RE = /(kontakt|contact|about|apie|um-okkur|hafa|samband|reserv|rezerv|booking|book|impressum|imprint|info)/i;

export function findPriorityLinks(html: string, baseUrl: string, domain: string, limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    const href = m[1] ?? "";
    if (/^(mailto|tel|javascript):/i.test(href)) continue;
    let u: URL;
    try {
      u = new URL(href, baseUrl);
    } catch {
      continue;
    }
    if (normalizeDomain(u.hostname) !== domain) continue;
    if (/\.(pdf|jpe?g|png|gif|zip|docx?)$/i.test(u.pathname)) continue;
    const key = u.origin + u.pathname;
    if (seen.has(key) || !PRIORITY_RE.test(u.pathname)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= limit) break;
  }
  return out;
}

export function robotsDisallowsAll(robots: string): boolean {
  let applies = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.split("#")[0]!.trim();
    const [k, ...rest] = line.split(":");
    const key = (k ?? "").trim().toLowerCase();
    const val = rest.join(":").trim();
    if (key === "user-agent") applies = val === "*";
    else if (applies && key === "disallow" && val === "/") return true;
  }
  return false;
}

export function confidenceFor(email: string, siteDomain: string, mx: string): string {
  const d = email.split("@")[1] ?? "";
  if (mx === "none") return "low";
  if (d === siteDomain || d.endsWith(`.${siteDomain}`) || siteDomain.endsWith(`.${d}`)) return mx === "ok" ? "high" : "medium";
  return "medium";
}

// Big platforms / directories whose pages never yield the business's own contact.
const PLATFORM_RE = /(^|\.)(booking\.com|airbnb\.[a-z.]+|tripadvisor\.[a-z.]+|expedia\.[a-z.]+|hotels\.com|agoda\.com|trivago\.[a-z.]+|vrbo\.com|kayak\.[a-z.]+|facebook\.com|instagram\.com|google\.[a-z.]+|wikipedia\.org|youtube\.com|yelp\.[a-z.]+|linkedin\.com|tiktok\.com|x\.com|twitter\.com|marriott\.com|hilton\.com|ihg\.com|hyatt\.com|wyndhamhotels\.com|choicehotels\.com|accor\.com|bestwestern\.com)$/i;
export function isPlatformDomain(domain: string): boolean {
  return PLATFORM_RE.test(domain.toLowerCase());
}
