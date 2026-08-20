import { href, t, type Lang } from "@/lib/i18n";

export function Footer({ lang, altHref }: { lang: Lang; altHref: string }) {
  const c = t(lang);
  const home = href(lang);

  const links = [
    { label: c.nav.product, href: `${home}#product` },
    { label: c.nav.approach, href: `${home}#approach` },
    { label: c.nav.who, href: `${home}#fit` },
    { label: c.nav.blog, href: href(lang, "blog") },
    { label: c.nav.faq, href: `${home}#faq` },
    { label: c.nav.cta, href: `${home}#demo` },
  ];

  return (
    <footer className="bg-teal-900 text-cream/80">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <a href={home} className="flex items-baseline gap-1 font-display text-3xl font-semibold text-cream">
            Revoo
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber" />
          </a>
          <p className="measure mt-4 text-[0.95rem] leading-relaxed">{c.footer.tagline}</p>
        </div>

        <nav aria-label={c.footer.linksTitle}>
          <h2 className="eyebrow mb-4 font-sans text-amber">{c.footer.linksTitle}</h2>
          <ul className="space-y-2 text-[0.95rem]">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="transition-colors hover:text-cream">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow mb-4 font-sans text-amber">{c.footer.langTitle}</h2>
          <ul className="space-y-2 text-[0.95rem]">
            <li>
              <a
                href={lang === "en" ? home : altHref}
                hrefLang="en"
                className="transition-colors hover:text-cream"
              >
                English
              </a>
            </li>
            <li>
              <a
                href={lang === "lt" ? home : altHref}
                hrefLang="lt"
                className="transition-colors hover:text-cream"
              >
                Lietuvių
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="container-page flex flex-col gap-2 py-6 text-[0.85rem] text-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>{c.footer.rights}</p>
          <p>{c.footer.contact}</p>
        </div>
      </div>
    </footer>
  );
}
