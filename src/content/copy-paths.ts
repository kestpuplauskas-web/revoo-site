import type { Copy } from "./copy.types";

export type CopyEntry = { path: string; value: string };

/**
 * Redaguojamos pagrindinio puslapio sekcijos (lietuviški pavadinimai).
 * Meniu juosta, poraštė ir blogas čia neįtraukti — jie naudojami ir kituose puslapiuose.
 */
export const SECTION_LABELS: Record<string, string> = {
  hero: "Pirmasis ekranas",
  features: "Galimybės",
  approach: "Požiūris",
  week: "Kambarinių savaitė",
  morning: "Rytas",
  paperwork: "Dokumentai",
  channel: "Kanalai",
  segments: "Kam skirta",
  ctaBand: "Kvietimo juosta",
  pricing: "Kainų skaičiuoklė",
  included: "Kas įskaičiuota",
  fit: "Ar tinka",
  start: "Kaip pradėti",
  demo: "Demo forma",
  faq: "DUK",
  contacts: "Kontaktai",
  media: "Vaizdų aprašymai",
};

/** Sekcijų eilė administravimo puslapyje. */
export const SECTION_ORDER = Object.keys(SECTION_LABELS);

/** Ar šį kelią leidžiama redaguoti. */
export function isEditablePath(path: string): boolean {
  const root = path.split(".")[0] ?? "";
  return root in SECTION_LABELS;
}

function walk(value: unknown, prefix: string, out: CopyEntry[]): void {
  if (typeof value === "string") {
    out.push({ path: prefix, value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${prefix}.${i}`, out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walk(v, prefix ? `${prefix}.${k}` : k, out);
    }
  }
}

/** Visi teksto laukai kaip plokščias sąrašas su keliais, pvz. "hero.h1". */
export function flattenCopy(copy: Copy): CopyEntry[] {
  const out: CopyEntry[] = [];
  walk(copy, "", out);
  return out;
}

function setPath(target: Record<string, unknown>, path: string, value: string): void {
  const parts = path.split(".");
  let node: Record<string, unknown> | unknown[] = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i]!;
    const next = Array.isArray(node)
      ? (node as unknown[])[Number(key)]
      : (node as Record<string, unknown>)[key];
    if (!next || typeof next !== "object") return; // nežinomas kelias — tyliai praleidžiam
    node = next as Record<string, unknown> | unknown[];
  }
  const last = parts[parts.length - 1]!;
  if (Array.isArray(node)) {
    const idx = Number(last);
    if (Number.isInteger(idx) && idx >= 0 && idx < node.length) node[idx] = value;
  } else if (typeof (node as Record<string, unknown>)[last] === "string") {
    (node as Record<string, unknown>)[last] = value;
  }
}

/** Grąžina naują Copy kopiją su pritaikytais perrašymais. */
export function applyCopyOverrides(base: Copy, overrides: Record<string, string>): Copy {
  const keys = Object.keys(overrides);
  if (keys.length === 0) return base;
  const clone = structuredClone(base) as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = overrides[key];
    if (typeof value === "string") setPath(clone, key, value);
  }
  return clone as unknown as Copy;
}
