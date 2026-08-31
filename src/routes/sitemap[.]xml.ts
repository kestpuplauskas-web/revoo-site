import { createFileRoute } from "@tanstack/react-router";

import { posts } from "@/content/posts";
import { absUrl } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type Entry = { loc: string; lastmod: string; alternates: { lang: string; href: string }[] };

function latestDate(filter?: Lang): string {
  const dates = posts.filter((p) => !filter || p.lang === filter).map((p) => p.date).sort();
  return dates[dates.length - 1]!;
}

function buildSitemap(): string {
  const enHome = absUrl("en");
  const ltHome = absUrl("lt");
  const enBlog = absUrl("en", "blog");
  const ltBlog = absUrl("lt", "blog");

  const anyLatest = latestDate();

  const entries: Entry[] = [
    {
      loc: enHome,
      lastmod: anyLatest,
      alternates: [
        { lang: "en", href: enHome },
        { lang: "lt", href: ltHome },
        { lang: "x-default", href: enHome },
      ],
    },
    {
      loc: ltHome,
      lastmod: anyLatest,
      alternates: [
        { lang: "en", href: enHome },
        { lang: "lt", href: ltHome },
        { lang: "x-default", href: enHome },
      ],
    },
    {
      loc: enBlog,
      lastmod: latestDate("en"),
      alternates: [
        { lang: "en", href: enBlog },
        { lang: "lt", href: ltBlog },
        { lang: "x-default", href: enBlog },
      ],
    },
    {
      loc: ltBlog,
      lastmod: latestDate("lt"),
      alternates: [
        { lang: "en", href: enBlog },
        { lang: "lt", href: ltBlog },
        { lang: "x-default", href: enBlog },
      ],
    },
  ];

  for (const post of posts) {
    const loc = absUrl(post.lang, `blog/${post.slug}`);
    // A page that exists in only one language gets no hreflang annotations.
    const translations = posts.filter((p) => p.slug === post.slug || p.translationOf === post.slug);
    const alternates =
      translations.length > 1
        ? translations.map((p) => ({ lang: p.lang, href: absUrl(p.lang, `blog/${p.slug}`) }))
        : [];
    entries.push({ loc, lastmod: post.date, alternates });
  }

  const body = entries
    .map((entry) => {
      const alts = entry.alternates
        .map((alt) => `\n    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${alt.href}"/>`)
        .join("");
      return `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${entry.lastmod}</lastmod>${alts}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(buildSitemap(), {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        }),
    },
  },
});
