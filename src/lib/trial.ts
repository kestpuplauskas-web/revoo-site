import { href, type Lang } from "./i18n";

export const TRIAL_REGISTRATION_URL = "https://app.revoostay.com/register";

/** English trial links go directly to the hotel app; LT keeps its independent contact flow. */
export function demoCtaHref(lang: Lang): string {
  return lang === "en" ? TRIAL_REGISTRATION_URL : `${href(lang)}#demo`;
}