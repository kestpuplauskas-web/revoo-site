import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { href, t, type Lang } from "@/lib/i18n";
import { demoCtaHref } from "@/lib/trial";

export function Footer({ lang, altHref }: { lang: Lang; altHref: string }) {
  const c = t(lang);
  const home = href(lang);

  const product = [
    { label: c.nav.product, href: `${home}#product` },
    { label: c.nav.pricing, href: lang === "en" ? "/pricing/" : `${home}#pricing` },
    ...(lang === "lt"
      ? [
          { label: c.nav.approach, href: `${home}#approach` },
          { label: c.nav.who, href: `${home}#fit` },
        ]
      : []),
    { label: c.nav.cta, href: demoCtaHref(lang) },
  ];

  const resources = [
    { label: c.nav.blog, href: href(lang, "blog") },
    { label: c.nav.faq, href: `${home}#faq` },
    { label: c.nav.contact, href: `${home}#contacts` },
  ];

  const heading = "mb-4 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-amber/90";
  const linkCls = "inline-block py-1 transition-colors hover:text-cream focus-visible:text-cream";

  const Col = ({ title, items }: { title: string; items: { label: string; href: string }[] }) => (
    <nav aria-label={title}>
      <h2 className={heading}>{title}</h2>
      <ul className="space-y-1.5 text-[0.95rem]">
        {items.map((link) => (
          <li key={link.href}>
            <a href={link.href} className={linkCls}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <footer className="bg-teal-900 text-cream/80">
      <div className="container-page grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div>
          <a href={home} className="flex items-baseline gap-1 font-display text-3xl font-semibold text-cream">
            Revoo
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber" />
          </a>
          <p className="measure mt-4 text-[0.95rem] leading-relaxed">{c.footer.tagline}</p>
        </div>

        <Col title={c.footer.linksTitle} items={product} />
        <Col title={c.footer.resourcesTitle} items={resources} />

        <div>
          <h2 className={heading}>{c.footer.contactTitle}</h2>
          <ul className="space-y-3 text-[0.95rem]">
            <li className="flex gap-3">
              <Mail aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-amber/80" />
              <a href={`mailto:${c.contacts.email}`} className="transition-colors hover:text-cream">
                {c.contacts.email}
              </a>
            </li>
            <li className="flex gap-3">
              <Phone aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-amber/80" />
              <a href={`tel:${c.contacts.phone.replace(/[^+\d]/g, "")}`} className="transition-colors hover:text-cream">
                {c.contacts.phone}
              </a>
            </li>
            <li className="flex gap-3">
              <MapPin aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-amber/80" />
              <span>{c.contacts.address}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="container-page flex flex-col gap-3 py-6 text-[0.85rem] text-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>{c.footer.rights}</p>
          <div className="flex items-center gap-2" aria-label={c.footer.langTitle}>
            <Globe aria-hidden="true" className="h-4 w-4" />
            <a
              href={lang === "en" ? home : altHref}
              hrefLang="en"
              aria-current={lang === "en" ? "true" : undefined}
              className={`py-2 transition-colors hover:text-cream ${lang === "en" ? "font-semibold text-cream" : ""}`}
            >
              English
            </a>
            <span aria-hidden="true">·</span>
            <a
              href={lang === "lt" ? home : altHref}
              hrefLang="lt"
              aria-current={lang === "lt" ? "true" : undefined}
              className={`py-2 transition-colors hover:text-cream ${lang === "lt" ? "font-semibold text-cream" : ""}`}
            >
              Lietuvių
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
