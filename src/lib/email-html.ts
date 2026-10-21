/**
 * Saugus el. laiško HTML: palieka tik pašto filtrams draugišką formatavimą
 * (paryškinimai, kursyvas, sąrašai, lygiavimas, nuorodos) ir išvalo Word/DOCX šiukšles.
 * Veikia be DOM, todėl naudojama ir naršyklėje, ir serveryje.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "div", "span", "b", "strong", "i", "em", "u", "s",
  "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "blockquote", "hr",
  "table", "thead", "tbody", "tr", "td", "th",
]);
const VOID_TAGS = new Set(["br", "hr"]);
const ALLOWED_STYLES = new Set([
  "font-weight", "font-style", "text-decoration", "text-align", "color",
  "background-color", "font-size", "font-family", "line-height",
  "margin-left", "padding-left", "text-indent",
]);
const SAFE_FONTS = /^(arial|helvetica|verdana|tahoma|trebuchet ms|georgia|times new roman|times|courier new|calibri|cambria|garamond|sans-serif|serif|monospace)$/i;

export const isHtml = (s: string) => /<\s*(p|br|div|b|strong|i|em|u|ul|ol|li|a|span|h[1-4])\b/i.test(s);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function plainToHtml(text: string): string {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function cleanStyle(style: string): string {
  const out: string[] = [];
  for (const decl of style.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    let val = decl.slice(i + 1).trim().replace(/!important/gi, "").trim();
    if (!ALLOWED_STYLES.has(prop) || !val) continue;
    if (/url\(|expression|javascript:|[<>"]/i.test(val)) continue;
    if (prop === "font-family") {
      const fonts = val.split(",").map((f) => f.trim().replace(/^['"]|['"]$/g, "")).filter((f) => SAFE_FONTS.test(f));
      if (!fonts.length) continue;
      val = fonts.map((f) => (f.includes(" ") ? `'${f}'` : f)).join(", ");
    }
    if (prop === "font-size" && !/^\d+(\.\d+)?(px|pt|em|%)$/i.test(val)) continue;
    if ((prop === "background-color" || prop === "color") && /^(transparent|windowtext|initial|inherit)$/i.test(val)) continue;
    out.push(`${prop}:${val}`);
  }
  return out.join(";");
}

function cleanHref(href: string): string | null {
  const h = href.trim().replace(/&amp;/g, "&");
  if (/^(https?:|mailto:|tel:)/i.test(h) || /^\{\{\s*[a-z_]+\s*\}\}/i.test(h)) return escapeHtml(h);
  return null;
}

function attr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null;
}

export function sanitizeEmailHtml(input: string): string {
  let s = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, "")
    .replace(/<(script|style|head|title|xml|meta|link|iframe|object|embed|svg|math|template)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|meta|link|iframe|object|embed)\b[^>]*>/gi, "")
    .replace(/<\/?(html|body|o:p|w:[a-z]+|v:[a-z]+|st1:[a-z]+)\b[^>]*>/gi, "");

  s = s.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (_m, close: string, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (close) return VOID_TAGS.has(tag) ? "" : `</${tag}>`;
    const parts: string[] = [];
    const style = attr(attrs, "style");
    if (style) {
      const c = cleanStyle(style);
      if (c) parts.push(`style="${c}"`);
    }
    const align = attr(attrs, "align");
    if (align && /^(left|right|center|justify)$/i.test(align)) parts.push(`align="${align.toLowerCase()}"`);
    if (tag === "a") {
      const href = attr(attrs, "href");
      const safe = href ? cleanHref(href) : null;
      if (safe) parts.push(`href="${safe}"`);
    }
    return `<${tag}${parts.length ? " " + parts.join(" ") : ""}>`;
  });

  return s
    .replace(/<span>([\s\S]*?)<\/span>/g, "$1")
    .replace(/<p>\s*<\/p>/g, "<p><br></p>")
    .replace(/\s+/g, " ")
    .trim();
}

/** Grynojo teksto versija laiškui (multipart alternative). */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|h[1-4]|li|tr|blockquote)>/gi, "\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, h: string, t: string) => `${t} (${h})`)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Bet kokį turinį (seną paprastą tekstą ar HTML) paverčia saugiu HTML. */
export function toEmailHtml(body: string): string {
  return isHtml(body) ? sanitizeEmailHtml(body) : plainToHtml(body);
}
