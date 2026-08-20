import { Globe } from "lucide-react";
import { useEffect, useState } from "react";

import { CtaLink } from "./primitives";
import { href, t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Header({ lang, altHref }: { lang: Lang; altHref: string }) {
  const c = t(lang);
  const [scrolled, setScrolled] = useState(false);
  const home = href(lang);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: c.nav.product, href: `${home}#product` },
    { label: c.nav.approach, href: `${home}#approach` },
    { label: c.nav.who, href: `${home}#fit` },
    { label: c.nav.blog, href: href(lang, "blog") },
    { label: c.nav.faq, href: `${home}#faq` },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-[250ms] ease-out",
        scrolled
          ? "border-b border-ink/10 bg-cream/[0.82] backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-[68px] items-center justify-between gap-6">
        <a
          href={home}
          className={cn(
            "flex items-baseline gap-1 font-display text-2xl font-semibold transition-colors",
            scrolled ? "text-ink" : "text-cream",
          )}
        >
          Revoo
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber" />
        </a>

        <nav
          aria-label={c.nav.home}
          className={cn(
            "hidden items-center gap-7 text-[0.92rem] lg:flex",
            scrolled ? "text-ink-soft" : "text-cream/85",
          )}
        >
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-teal-500">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "hidden items-center gap-1.5 text-[0.8rem] font-medium sm:flex",
              scrolled ? "text-ink-soft" : "text-cream/85",
            )}
          >
            <Globe aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">{c.nav.langLabel}:</span>
            {lang === "en" ? (
              <>
                <span aria-current="true" className="text-teal-500">
                  EN
                </span>
                <span aria-hidden="true">/</span>
                <a href={altHref} hrefLang="lt" className="hover:text-teal-500">
                  LT
                </a>
              </>
            ) : (
              <>
                <a href={altHref} hrefLang="en" className="hover:text-teal-500">
                  EN
                </a>
                <span aria-hidden="true">/</span>
                <span aria-current="true" className="text-teal-500">
                  LT
                </span>
              </>
            )}
          </div>
          <CtaLink href={`${home}#demo`} tone={scrolled ? "solid" : "cream"} size="sm">
            {c.nav.cta}
          </CtaLink>
        </div>
      </div>
    </header>
  );
}
