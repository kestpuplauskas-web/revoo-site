import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import type { Copy } from "@/content/copy.types";
import type { SlotMedia } from "@/content/media-slots";
import type { Lang } from "@/lib/i18n";
import { demoCtaHref } from "@/lib/trial";
import { CtaLink, SignatureUnderlined } from "./primitives";
import { useMinPrice, withMin } from "@/hooks/useMinPrice";

const DURATION = 4500;

type Tab = { label: string; src: string; alt: string; phone?: { src: string; alt: string } };

const T = {
  en: { tabs: ["Multi-calendar", "Dashboard", "Housekeeping app", "Direct booking engine"], dashAlt: "Revoo business dashboard with occupancy and revenue", hkAlt: "Revoo housekeeping schedule", hkPhoneAlt: "Revoo housekeeping app on a phone", engineAlt: "Revoo direct booking engine on a property website", tour: "Product tour", proof: "Results and integrations", direct: "Increase in direct bookings", admin: "Less time spent on daily admin", works: "Works with", sync: "Channel sync and secure card payments" },
  lt: { tabs: ["Rezervacijų kalendorius", "Skydelis", "Tvarkymo programėlė", "Tiesioginių rezervacijų sistema"], dashAlt: "Revoo verslo skydelis su užimtumu ir pajamomis", hkAlt: "Revoo kambarių tvarkymo grafikas", hkPhoneAlt: "Revoo tvarkymo programėlė telefone", engineAlt: "Revoo tiesioginių rezervacijų sistema objekto svetainėje", tour: "Produkto apžvalga", proof: "Rezultatai ir integracijos", direct: "Daugiau tiesioginių rezervacijų", admin: "Mažiau laiko kasdieniam administravimui", works: "Veikia su", sync: "Kanalų sinchronizavimas ir saugūs mokėjimai kortele" },
} as const;

export function TrialHero({ lang = "en", copy: c, image, dashboard, siteCalendar }: { lang?: Lang; copy: Copy; image: SlotMedia; dashboard: SlotMedia; siteCalendar: SlotMedia }) {
  const L = T[lang];
  const tabs: Tab[] = [
    { label: L.tabs[0], src: image.url, alt: c.media.alt.calendar },
    { label: L.tabs[1], src: dashboard.url, alt: L.dashAlt },
    { label: L.tabs[2], src: "/media/8_housekeeping.webp", alt: L.hkAlt, phone: { src: "/media/7_housekeeping_app.webp", alt: L.hkPhoneAlt } },
    { label: L.tabs[3], src: siteCalendar.url, alt: L.engineAlt },
  ];
  const minPrice = useMinPrice();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hover, setHover] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  useEffect(() => {
    if (reduced || hover) return;
    const t = window.setTimeout(() => {
      if (!auto) setAuto(true);
      else setActive((a) => (a + 1) % tabs.length);
    }, auto ? DURATION : 12000);
    return () => window.clearTimeout(t);
  }, [active, auto, reduced, hover, tabs.length]);
  const running = auto && !reduced && !hover;

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
          <CtaLink href={demoCtaHref(lang)} tone="cream" className="min-h-12 gap-3">
            {c.hero.primary}<ArrowRight aria-hidden="true" className="h-4 w-4" />
          </CtaLink>
          <a href="#product" className="inline-flex min-h-11 items-center gap-2 px-3 text-sm underline underline-offset-4">
            {c.hero.secondary}<ArrowDown aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
        <p className="mt-4 text-sm text-primary-foreground/90">{c.hero.status}</p>

        <div className="mx-auto mt-9 max-w-[1060px]">
          <div role="tablist" aria-label={L.tour} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tabs.map((t, i) => (
              <button key={t.label} role="tab" type="button" aria-selected={i === active} aria-controls="rv-tour-panel"
                onClick={() => { setActive(i); setAuto(false); }}
                className={`min-h-11 rounded-md px-3 pb-2 pt-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-light ${i === active ? "bg-primary-foreground/15 font-semibold" : "text-primary-foreground/75 hover:bg-primary-foreground/10"}`}>
                <span className="block">{i + 1}. {t.label}</span>
                <span className="mt-2 block h-0.5 overflow-hidden rounded bg-primary-foreground/20">
                  {i === active && (
                    <span key={`${active}-${auto}`} className="block h-full origin-left bg-amber-light"
                      style={auto && !reduced ? { animation: `rv-progress ${DURATION}ms linear forwards`, animationPlayState: running ? "running" : "paused" } : undefined} />
                  )}
                </span>
              </button>
            ))}
          </div>

          <div className="relative mt-4" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            <div id="rv-tour-panel" role="tabpanel" aria-label={tabs[active]?.label}
              className="relative aspect-[16/10] overflow-hidden rounded-t-lg border border-primary-foreground/20 bg-teal-900">
              {tabs.map((t, i) => (
                <div key={t.src} aria-hidden={i !== active}
                  className={`absolute inset-0 transition-opacity duration-500 ${i === active ? "opacity-100" : "opacity-0"}`}>
                  <img src={t.src} alt={i === active ? t.alt : ""}
                    fetchPriority={i === 0 ? "high" : "low"} loading={i === 0 ? "eager" : "lazy"}
                    className={`h-full w-full object-contain ${t.phone ? "opacity-40" : ""}`} />
                  {t.phone && (
                    <img src={t.phone.src} alt={i === active ? t.phone.alt : ""} loading="lazy" width={738} height={1600}
                      style={{ width: "auto", height: "92%", maxWidth: "none", aspectRatio: "738 / 1600" }} className="absolute left-1/2 top-[4%] -translate-x-1/2 rounded-[1.75rem] border-4 border-foreground/80 shadow-2xl" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-10 gap-y-3 border-t border-primary-foreground/15 bg-teal-900 px-6 py-5">
        {c.pricing.badges.map((badge) => <li key={badge} className="flex items-center gap-2 text-sm">
          <Check aria-hidden="true" className="h-4 w-4 text-amber-light" />{withMin(badge, minPrice)}
        </li>)}
      </ul>
      <div aria-labelledby="proof-title" className="bg-teal-900 px-6 pb-14 pt-10" role="region">
        <h2 id="proof-title" className="sr-only">{L.proof}</h2>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_1fr_1.3fr] md:divide-x md:divide-primary-foreground/15">
          <div className="text-center md:px-6">
            <p className="font-display text-5xl text-amber-light">+27%</p>
            <p className="mt-2 text-sm text-primary-foreground/80">{L.direct}</p>
          </div>
          <div className="text-center md:px-6">
            <p className="font-display text-5xl text-amber-light">72%</p>
            <p className="mt-2 text-sm text-primary-foreground/80">{L.admin}</p>
          </div>
          <div className="text-center md:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary-foreground/60">{L.works}</p>
            <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-lg font-semibold text-primary-foreground">
              <li>Booking.com</li><li>Airbnb</li><li>Stripe</li>
            </ul>
            <p className="mt-2 text-xs text-primary-foreground/60">{L.sync}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
