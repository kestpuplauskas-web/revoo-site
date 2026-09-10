export type FeatureKey =
  | "booking-engine"
  | "pms"
  | "revenue"
  | "housekeeping"
  | "invoicing"
  | "support";

export type FeatureSection = {
  h2: string;
  body: string;
  bullets: string[];
};

export type Feature = {
  key: FeatureKey;
  slug: string;
  /** Card title on the homepage grid. */
  card: string;
  h1: string;
  eyebrow: string;
  metaTitle: string;
  metaDescription: string;
  lede: string;
  sections: FeatureSection[];
  faq: { q: string; a: string }[];
  keywords: string[];
};

export type FeatureCopy = {
  /** Index page. */
  indexTitle: string;
  indexMetaTitle: string;
  indexMetaDescription: string;
  indexH1: string;
  indexLede: string;
  indexEyebrow: string;
  /** UI labels. */
  more: string;
  back: string;
  ctaTitle: string;
  ctaBody: string;
  ctaButton: string;
  keywordsTitle: string;
  items: Feature[];
};
