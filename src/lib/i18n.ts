import { copy, type Lang } from "@/content/copy";

export type { Lang };
export const SITE_URL = "https://revoo.site";
export const LANGS: Lang[] = ["en", "lt"];

export function t(lang: Lang) {
  return copy[lang];
}

/** Internal href for a language + section path ("", "blog", "blog/slug"). */
export function href(lang: Lang, path = ""): string {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const prefix = lang === "lt" ? "/lt" : "";
  return clean ? `${prefix}/${clean}` : prefix || "/";
}

/** Absolute, canonical URL with trailing slash, as required for hreflang/canonical. */
export function absUrl(lang: Lang, path = ""): string {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const prefix = lang === "lt" ? "/lt/" : "/";
  return clean ? `${SITE_URL}${prefix}${clean}/` : `${SITE_URL}${prefix}`;
}

export const SITE_IMAGE = `${SITE_URL}/media/11_dashboard.png`;

type HeadArgs = {
  lang: Lang;
  title: string;
  description: string;
  path?: string;
  /** Path of the same page in the other language; omit when there is no pair. */
  altPath?: string | null;
  jsonLd?: object[];
  /** "article" for blog posts, "website" elsewhere. */
  ogType?: "website" | "article";
  image?: string;
};

export function buildHead({
  lang,
  title,
  description,
  path = "",
  altPath,
  jsonLd = [],
  ogType = "website",
  image = SITE_IMAGE,
}: HeadArgs) {
  const canonical = absUrl(lang, path);
  const other: Lang = lang === "en" ? "lt" : "en";
  const links: Array<Record<string, string>> = [{ rel: "canonical", href: canonical }];

  if (altPath !== null) {
    const enHref = lang === "en" ? canonical : absUrl("en", altPath ?? path);
    const ltHref = lang === "lt" ? canonical : absUrl("lt", altPath ?? path);
    links.push(
      { rel: "alternate", hrefLang: "en", href: enHref },
      { rel: "alternate", hrefLang: "lt", href: ltHref },
      { rel: "alternate", hrefLang: "x-default", href: enHref },
    );
  } else {
    links.push(
      { rel: "alternate", hrefLang: lang, href: canonical },
      { rel: "alternate", hrefLang: "x-default", href: absUrl("en") },
    );
  }
  void other;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: ogType },
      { property: "og:url", content: canonical },
      { property: "og:locale", content: lang === "lt" ? "lt_LT" : "en_GB" },
      { property: "og:site_name", content: "Revoo" },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links,
    scripts: jsonLd.map((data) => ({
      type: "application/ld+json",
      children: JSON.stringify(data),
    })),
  };
}


export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Revoo",
    url: SITE_URL,
    email: "hello@revoo.site",
    areaServed: ["LT", "IS"],
  };
}

export function softwareApplicationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Revoo",
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    publisher: { "@type": "Organization", name: "Revoo", url: SITE_URL },
  };
}

export function faqLd(items: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function blogPostingLd(args: {
  lang: Lang;
  headline: string;
  description: string;
  datePublished: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: args.headline,
    description: args.description,
    datePublished: args.datePublished,
    inLanguage: args.lang === "lt" ? "lt-LT" : "en",
    mainEntityOfPage: args.url,
    author: { "@type": "Organization", name: "Revoo", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Revoo", url: SITE_URL },
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export const homeSeo: Record<Lang, { title: string; description: string }> = {
  en: {
    title:
      "Revoo — property management system and booking website for small hotels, cabins and guesthouses",
    description:
      "A property management system and a booking website in one, built around how your property actually works. For independent hotels, cabins, guesthouses and apartments. Request a demo.",
  },
  lt: {
    title:
      "Revoo — apgyvendinimo valdymo sistema ir rezervacijų svetainė viešbučiams ir svečių namams",
    description:
      "Apgyvendinimo valdymo sistema ir rezervacijų svetainė vienoje vietoje, pritaikyta tam, kaip jūsų objektas realiai dirba. Viešbučiams, nameliams, svečių namams ir apartamentams. Užsisakykite demo.",
  },
};

export const copyHead: Record<Lang, { home: string; blog: string }> = {
  en: { home: copy.en.nav.home, blog: copy.en.blog.title },
  lt: { home: copy.lt.nav.home, blog: copy.lt.blog.title },
};
