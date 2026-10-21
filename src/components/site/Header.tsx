import { Globe, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";

import { CtaLink } from "./primitives";
import { href, t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { demoCtaHref } from "@/lib/trial";

export function Header({
  lang,
  altHref,
  variant = "overlay",
}: {
  lang: Lang;
  altHref: string;
  variant?: "overlay" | "solid";
}) {
  const c = t(lang);
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = variant === "solid" ? true : isScrolled;
  const home = href(lang);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: c.nav.home, href: home },
    { label: c.nav.product, href: `${home}#product` },
    { label: c.nav.approach, href: `${home}#approach` },
    { label: c.nav.who, href: `${home}#fit` },
    { label: c.nav.pricing, href: `${home}#pricing` },
    { label: c.nav.blog, href: href(lang, "blog") },
    { label: c.nav.faq, href: `${home}#faq` },
    { label: c.nav.contact, href: `${home}#contacts` },
  ].filter((link) => lang === "lt" || ![`${home}#approach`, `${home}#fit`, home].includes(link.href));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-[250ms] ease-out",
        scrolled
          ? "border-b border-ink/10 bg-background"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-[68px] items-center justify-between gap-3">
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
            "hidden items-center gap-5 text-[0.85rem] xl:flex",
            scrolled ? "text-ink-soft" : "text-cream/85",
          )}
        >
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-teal-500">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
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
          <CtaLink href={demoCtaHref(lang)} tone={scrolled ? "solid" : "cream"} size="sm">
            {c.nav.cta}
          </CtaLink>
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogPrimitive.Trigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 xl:hidden" aria-label={lang === "en" ? "Open menu" : "Atidaryti meniu"}>
                <Menu aria-hidden="true" className={scrolled ? "text-foreground" : "text-primary-foreground"} />
              </Button>
            </DialogPrimitive.Trigger>
            <DialogPortal>
              <DialogOverlay className="bg-foreground/60" />
              <DialogPrimitive.Content aria-describedby={undefined} className="fixed inset-y-0 right-0 z-[60] w-full max-w-sm overflow-y-auto bg-background p-6 text-foreground shadow-lg">
                <div className="flex items-center justify-between">
                  <DialogTitle className="font-display text-3xl">Revoo</DialogTitle>
                  <DialogClose asChild><Button variant="ghost" size="icon" className="h-11 w-11" aria-label={lang === "en" ? "Close menu" : "Uždaryti meniu"}><X /></Button></DialogClose>
                </div>
                <a href="tel:+37065287044" className="mt-6 block min-h-11 text-primary">{c.nav.contactPhone}</a>
                <nav aria-label={c.nav.home} className="mt-3 flex flex-col border-t border-border">
                  {links.map(link => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center border-b border-border py-3">{link.label}</a>)}
                </nav>
                <div className="mt-6 flex items-center gap-4"><span>{lang.toUpperCase()}</span><a href={altHref} className="flex min-h-11 items-center underline">{lang === "en" ? "Lietuvių" : "English"}</a></div>
                <CtaLink href={demoCtaHref(lang)} className="mt-6 w-full">{c.nav.cta}</CtaLink>
              </DialogPrimitive.Content>
            </DialogPortal>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
