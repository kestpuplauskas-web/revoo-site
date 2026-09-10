import { featuresEn } from "./features.en";
import { featuresLt } from "./features.lt";
import type { Feature, FeatureCopy, FeatureKey } from "./features.types";
import type { Lang } from "./copy.types";

export const featureCopy: Record<Lang, FeatureCopy> = { en: featuresEn, lt: featuresLt };

/** URL segment of the features section per language. */
export function featureBase(lang: Lang): string {
  return lang === "lt" ? "funkcijos" : "features";
}

/** Router path (no language prefix) for a feature detail page. */
export function featurePath(lang: Lang, slug: string): string {
  return `${featureBase(lang)}/${slug}`;
}

/** Internal href with language prefix and trailing slash. */
export function featureHref(lang: Lang, slug?: string): string {
  const prefix = lang === "lt" ? "/lt" : "";
  return slug ? `${prefix}/${featureBase(lang)}/${slug}/` : `${prefix}/${featureBase(lang)}/`;
}

export function getFeature(lang: Lang, slug: string): Feature | undefined {
  return featureCopy[lang].items.find((item) => item.slug === slug);
}

export function featureSlugByKey(lang: Lang, key: FeatureKey): string | undefined {
  return featureCopy[lang].items.find((item) => item.key === key)?.slug;
}

export type { Feature, FeatureCopy, FeatureKey };
