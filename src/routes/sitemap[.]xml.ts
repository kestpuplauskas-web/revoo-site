import { createFileRoute } from "@tanstack/react-router";

import { posts } from "@/content/posts";
import { absUrl, SITE_URL } from "@/lib/i18n";

type Entry = { loc: string; alternates: { lang: string; href: string }[] };

function buildSitemap(): string {
  const enHome = absUrl("en");
  const ltHome = absUrl("lt");
  const enBlog = absUrl("en", "blog");
  const ltBlog = absUrl("lt", "blog");

  const entries: Entry[] = [
    {
      loc: enHome,
      alternates: [
        { lang: "en", href: enHome },
        { lang: "lt", href: ltHome },
        { lang: "x-default", href: enHome },
      ],
    },
    {
      loc: ltHome,
      alternates: [
        { lang: "en", href: enHome },
        { lang: "lt", href: ltHome },
        { lang: "x-default", href: enHome },
      ],
    },
    {
      loc: enBlog,
      alternates: [
        { lang: "en", href: enBlog },
        { lang: "lt", href: ltBlog },
        { lang: "x-default", href: enBlog },
      ],
    },
    {
      loc: ltBlog,
      alternates: [
        { lang: "en", href: enBlog },
        { lang: "lt", href: ltBlog },
        { lang: "x-default", href: enBlog },
      ],
    },
  ];

  for (const post of posts) {
    const loc = absUrl(post.lang, `blog/${post.slug}`);
    entries.push({
      loc,
      alternates: [
        { lang: post.lang, href: loc },
        { lang: "x-default", href: enHome },
      ],
    });
  }

  const body = entries
    .map((entry) => {
      const alts = entry.alternates
        .map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${alt.href}"/>`)
        .join("\n");
      return `  <url>\n    <loc>${entry.loc}</loc>\n${alts}\n  </url>`;
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
            "x-site": SITE_URL,
          },
        }),
    },
  },
});
