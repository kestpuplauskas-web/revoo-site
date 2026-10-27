import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, BellRing, Check, CircleDollarSign } from "lucide-react";
import type { Copy } from "@/content/copy.types";
import type { SlotMedia } from "@/content/media-slots";
import { demoCtaHref } from "@/lib/trial";
import { CtaLink, SignatureUnderlined } from "./primitives";

const DURATION = 6000;

export function TrialHero({ copy: c, image }: { copy: Copy; image: SlotMedia }) {
  const tabs = [
    { label: "Multi-calendar", src: image.url, alt: c.media.alt.calendar },
    { label: "Housekeeping app", src: "/media/7_housekeeping_app.webp", alt: "Revoo housekeeping app on a phone" },
    { label: "Direct booking engine", src: "/media/6_booking_v2.webp", alt: "Revoo direct booking engine for guests" },
    { label: "Invoices & finance", src: "/media/9_invoice.webp", alt: "Automated invoice in Revoo" },
  ];
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  useEffect(() => {
    if (!auto || reduced) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % tabs.length), DURATION);
    return () => window.clearTimeout(t);
  }, [active, auto, reduced, tabs.length]);

  return (
    <section className="trial-hero bg-primary text-primary-foreground">
      <style>{`@keyframes rv-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes rv-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@media (prefers-reduced-motion:reduce){.rv-float{animation:none!important}}`}</style>
      <div className="container-page pt-28 text-center lg:pt-32">
        <p className="eyebrow text-amber-light">{c.hero.eyebrow}</p>
        <h1 className="trial-title mx-auto mt-5 max-w-[820px]">
          <SignatureUnderlined text={c.hero.h1} />
        </h1>
        <p className="mx-auto mt-5 max-w-[660px] text-base leading-relaxed text-primary-foreground/90 sm:text-lg">{c.hero.sub}</p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <CtaLink href={demoCtaHref("en")} tone="cream" className="min-h-12 gap-3">
            {c.hero.primary}<ArrowRight aria-hidden="true" className="h-4 w-4" />
          </CtaLink>
          <a href="#product" className="inline-flex min-h-11 items-center gap-2 px-3 text-sm underline underline-offset-4">
            {c.hero.secondary}<ArrowDown aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
        <p className="mt-4 text-sm text-primary-foreground/90">{c.hero.status}</p>

        <div className="mx-auto mt-9 max-w-[1060px]">
          <div role="tablist" aria-label="Product tour" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tabs.map((t, i) => (
              <button key={t.label} role="tab" type="button" aria-selected={i === active} aria-controls="rv-tour-panel"
                onClick={() => { setActive(i); setAuto(false); }}
                className={`min-h-11 rounded-md px-3 pb-2 pt-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-light ${i === active ? "bg-primary-foreground/15 font-semibold" : "text-primary-foreground/75 hover:bg-primary-foreground/10"}`}>
                <span className="block">{i + 1}. {t.label}</span>
                <span className="mt-2 block h-0.5 overflow-hidden rounded bg-primary-foreground/20">
                  {i === active && (
                    <span key={`${active}-${auto}`} className="block h-full origin-left bg-amber-light"
                      style={auto && !reduced ? { animation: `rv-progress ${DURATION}ms linear forwards` } : undefined} />
                  )}
                </span>
              </button>
            ))}
          </div>

          <div className="relative mt-4">
            <div id="rv-tour-panel" role="tabpanel" aria-label={tabs[active].label}
              className="relative aspect-[16/10] overflow-hidden rounded-t-lg border border-primary-foreground/20 bg-teal-900">
              {tabs.map((t, i) => (
                <img key={t.src} src={t.src} alt={i === active ? t.alt : ""} aria-hidden={i !== active}
                  fetchPriority={i === 0 ? "high" : "low"} loading={i === 0 ? "eager" : "lazy"}
                  className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${i === active ? "opacity-100" : "opacity-0"}`} />
              ))}
            </div>
            <div aria-hidden="true" className="rv-float pointer-events-none absolute -left-4 top-8 hidden items-center gap-3 rounded-lg bg-background px-4 py-3 text-left text-foreground shadow-xl md:flex"
              style={{ animation: "rv-float 5s ease-in-out infinite" }}>
              <CircleDollarSign className="h-6 w-6 text-primary" />
              <span className="text-sm leading-tight"><b>+€420 direct booking</b><br /><span className="text-muted-foreground">0% commission</span></span>
            </div>
            <div aria-hidden="true" className="rv-float pointer-events-none absolute -right-4 bottom-10 hidden items-center gap-3 rounded-lg bg-background px-4 py-3 text-left text-foreground shadow-xl md:flex"
              style={{ animation: "rv-float 5s ease-in-out 1.5s infinite" }}>
              <BellRing className="h-6 w-6 text-primary" />
              <span className="text-sm leading-tight"><b>Room 4 cleaned</b><br /><span className="text-muted-foreground">Ready for check-in</span></span>
            </div>
          </div>
        </div>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-10 gap-y-3 border-t border-primary-foreground/15 bg-teal-900 px-6 py-5">
        {c.pricing.badges.map((badge) => <li key={badge} className="flex items-center gap-2 text-sm">
          <Check aria-hidden="true" className="h-4 w-4 text-amber-light" />{badge}
        </li>)}
      </ul>
    </section>
  );
}
