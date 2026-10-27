import type { Lang } from "./i18n";

export const TRIAL_REGISTRATION_URL = "https://app.revoostay.com/register";

/** Trial links in both languages go directly to hotel registration. */
export function demoCtaHref(lang: Lang): string {
  void lang;
  return TRIAL_REGISTRATION_URL;
}