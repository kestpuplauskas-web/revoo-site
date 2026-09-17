// Pagrindinio puslapio medijos vaidmenys (angos) ir jų numatytieji failai.
// Angų sąrašas yra fiksuotas ir ateina iš čia — DB jį tik patvirtina.

export type SlotKey =
  | "booking-calendar"
  | "booking-video"
  | "housekeeping-week"
  | "housekeeping-phone"
  | "invoice"
  | "notification"
  | "dashboard"
  | "admin-phone"
  | "site-calendar"
  | "site-page-1"
  | "site-page-2";

export type SlotMedia = {
  url: string;
  width: number;
  height: number;
  posterUrl?: string;
  posterWidth?: number;
  posterHeight?: number;
};

export type SlotOverride = {
  url: string;
  width: number;
  height: number;
  posterUrl?: string;
  posterWidth?: number;
  posterHeight?: number;
};

export type SlotDef = {
  key: SlotKey;
  label: string;
  kind: "image" | "video";
  ratioW: number;
  ratioH: number;
  maxWidth: number;
  usedIn: string;
};

export const SLOT_DEFS: SlotDef[] = [
  { key: "booking-calendar", label: "Rezervacijų kalendorius", kind: "image", ratioW: 1867, ratioH: 937, maxWidth: 1867, usedIn: "Karuselė (2 vietos), rezervacijų sekcija, vaizdo įrašo posteris, LCP preload" },
  { key: "booking-video", label: "Rezervacijų vaizdo įrašas", kind: "video", ratioW: 1920, ratioH: 1080, maxWidth: 1920, usedIn: "Karuselė, 1 scena" },
  { key: "housekeeping-week", label: "Kambarinių savaitė", kind: "image", ratioW: 1863, ratioH: 895, maxWidth: 1863, usedIn: "Karuselė (2 vietos), kambarinių sekcija" },
  { key: "housekeeping-phone", label: "Kambarinių telefonas", kind: "video", ratioW: 384, ratioH: 848, maxWidth: 1080, usedIn: "Karuselė (2 vietos), kambarinių sekcija" },
  { key: "invoice", label: "Sąskaita", kind: "image", ratioW: 1275, ratioH: 1233, maxWidth: 1275, usedIn: "Karuselė, finansų sekcija" },
  { key: "notification", label: "Pranešimas klientui", kind: "image", ratioW: 1122, ratioH: 757, maxWidth: 1122, usedIn: "Karuselė (2 vietos)" },
  { key: "dashboard", label: "Skydelis", kind: "image", ratioW: 1867, ratioH: 862, maxWidth: 1867, usedIn: "Karuselė (2 vietos toje pačioje scenoje)" },
  { key: "admin-phone", label: "Administravimas telefone", kind: "video", ratioW: 384, ratioH: 848, maxWidth: 1080, usedIn: "Karuselė, 3 scena" },
  { key: "site-calendar", label: "Klientinės svetainės kalendorius", kind: "image", ratioW: 1705, ratioH: 946, maxWidth: 1705, usedIn: "Karuselė, klientinės svetainės sekcija" },
  { key: "site-page-1", label: "Klientinės svetainės pradžia", kind: "image", ratioW: 603, ratioH: 872, maxWidth: 603, usedIn: "Karuselė, 4 scena" },
  { key: "site-page-2", label: "Klientinės svetainės antrasis puslapis", kind: "image", ratioW: 581, ratioH: 845, maxWidth: 581, usedIn: "Karuselė, 4 scena" },
];

export const SLOT_MAP: Record<SlotKey, SlotDef> = Object.fromEntries(
  SLOT_DEFS.map((s) => [s.key, s]),
) as Record<SlotKey, SlotDef>;

export const DEFAULT_SLOTS: Record<SlotKey, SlotMedia> = {
  "booking-calendar": { url: "/media/6_booking.webp", width: 1867, height: 937 },
  "booking-video": { url: "/media/10_new_booking.mp4", width: 1920, height: 1080, posterUrl: "/media/6_booking.webp", posterWidth: 1867, posterHeight: 937 },
  "housekeeping-week": { url: "/media/8_housekeeping.webp", width: 1863, height: 895 },
  "housekeeping-phone": { url: "/media/7_housekeeping_app.mp4", width: 384, height: 848, posterUrl: "/media/7_housekeeping_app.webp", posterWidth: 738, posterHeight: 1600 },
  "invoice": { url: "/media/9_invoice.webp", width: 1275, height: 1233 },
  "notification": { url: "/media/4_notification_for_client.webp", width: 1122, height: 757 },
  "dashboard": { url: "/media/11_dashboard.webp", width: 1867, height: 862 },
  "admin-phone": { url: "/media/5_admin_app.mp4", width: 384, height: 848, posterUrl: "/media/5_admin_app.webp", posterWidth: 738, posterHeight: 1600 },
  "site-calendar": { url: "/media/1_homepage_calendar.webp", width: 1705, height: 946 },
  "site-page-1": { url: "/media/2_homepage_1.webp", width: 603, height: 872 },
  "site-page-2": { url: "/media/3_homepage_2.webp", width: 581, height: 845 },
};

/**
 * Sulieja DB perrašymus ant numatytųjų reikšmių.
 * Nežinomas slot_key iš DB tyliai ignoruojamas — senas įrašas neturi nulaužti puslapio.
 */
export function resolveSlots(overrides: Partial<Record<string, SlotOverride>>): Record<SlotKey, SlotMedia> {
  const result = { ...DEFAULT_SLOTS };
  for (const key of Object.keys(result) as SlotKey[]) {
    const ov = overrides[key];
    if (ov) {
      result[key] = {
        url: ov.url,
        width: ov.width,
        height: ov.height,
        ...(ov.posterUrl ? { posterUrl: ov.posterUrl, posterWidth: ov.posterWidth, posterHeight: ov.posterHeight } : {}),
      };
    }
  }
  return result;
}
