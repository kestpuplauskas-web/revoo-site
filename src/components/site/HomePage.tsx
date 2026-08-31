import { Check, X } from "lucide-react";

import { DemoForm } from "./DemoForm";
import { Faq } from "./Faq";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { HeroCarousel } from "../HeroCarousel";
import { MobileCtaBar } from "./MobileCtaBar";
import { SegmentsCarousel } from "./SegmentsCarousel";
import {
  BrowserFrame,
  CtaLink,
  Eyebrow,
  PhoneFrame,
  Reveal,
  Signature,
  SignatureUnderlined,
} from "./primitives";
import { media } from "@/content/media";
import { href, t, type Lang } from "@/lib/i18n";

export function HomePage({ lang }: { lang: Lang }) {
  const c = t(lang);
  const home = href(lang);
  const demoHref = `${home}#demo`;
  const altHref = lang === "en" ? "/lt" : "/";

  return (
    <div className="min-h-screen bg-cream">
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-cream focus:px-4 focus:py-2"
      >
        {c.nav.skip}
      </a>
      <Header lang={lang} altHref={altHref} />

      <main id="hero">
        {/* 1. Hero */}
        <section className="grid min-h-[88vh] grid-cols-1 lg:grid-cols-[55fr_45fr]">
          <div className="flex flex-col justify-center bg-teal-700 px-6 pb-16 pt-28 sm:px-10 lg:px-14 lg:py-32">
            <div className="mx-auto w-full max-w-[640px]">
              <p className="eyebrow mb-5 whitespace-pre-wrap text-amber">{c.hero.eyebrow}</p>
              <h1
                className={
                  lang === "lt"
                    ? "text-[clamp(1.6rem,4.2vw,2.8rem)] text-cream"
                    : "text-cream"
                }
              >
                <SignatureUnderlined text={c.hero.h1} />
              </h1>
              <p className="measure mt-7 text-[1.02rem] leading-relaxed text-cream/85">{c.hero.sub}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <CtaLink href={demoHref} tone="cream">
                  {c.hero.primary}
                </CtaLink>
                <CtaLink href={`${home}#product`} tone="outlineCream">
                  {c.hero.secondary}
                </CtaLink>
              </div>
              <p className="mt-10 flex items-center gap-3 whitespace-nowrap text-[0.78rem] text-cream/75">
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-100 opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-100" />
                </span>
                {c.hero.status}
              </p>
            </div>
          </div>
          <div className="relative min-h-[520px] bg-teal-900 lg:min-h-[660px]">
            <HeroCarousel lang={lang} />
          </div>

        </section>

        {/* 2. Approach */}
        <section id="approach" className="section-y bg-cream">
          <div className="container-page">
            <Reveal>
              <SectionHead
                eyebrow={c.approach.eyebrow}
                h2={c.approach.h2}
                lede={c.approach.lede}
                cta={{ href: demoHref, label: c.nav.cta }}
              />
            </Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <Reveal delay={60}>
                <article className="card-lift h-full rounded-2xl border border-ink/10 bg-white p-8">
                  <h3>{c.approach.cardA.title}</h3>
                  <p className="mt-4 text-ink-soft">{c.approach.cardA.body}</p>
                </article>
              </Reveal>
              <Reveal delay={120}>
                <article className="card-lift h-full rounded-2xl bg-teal-700 p-8 text-cream">
                  <h3>{c.approach.cardB.title}</h3>
                  <p className="mt-4 text-cream/85">{c.approach.cardB.body}</p>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        {/* 3. The week */}
        <section id="product" className="section-y bg-white">
          <div className="container-page grid items-center gap-14 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>{c.week.eyebrow}</Eyebrow>
              <h2>
                <Signature text={c.week.h2} />
              </h2>
              <p className="measure mt-5 text-ink-soft">{c.week.lede}</p>
              <PointList points={c.week.points} />
            </Reveal>
            <Reveal delay={60}>
              <BrowserFrame url={c.media.browserUrl}>
                <img
                  className="block h-auto w-full"
                  src="/media/6_booking.png"
                  alt={c.media.alt.calendar}
                  width={1867}
                  height={937}
                  loading="lazy"
                />
              </BrowserFrame>
            </Reveal>
          </div>
        </section>

        {/* 4. The morning */}
        <section className="section-y bg-teal-800">
          <div className="container-page grid items-center gap-16 lg:grid-cols-2">
            <Reveal className="relative flex justify-center">
              <img
                src={media.housekeepingWeek.url}
                width={media.housekeepingWeek.width}
                height={media.housekeepingWeek.height}
                alt={c.media.alt.housekeepingWeek}
                loading="lazy"
                className="pointer-events-none absolute inset-x-0 top-8 hidden rotate-[-4deg] rounded-2xl opacity-45 sm:block"
              />
              <PhoneFrame className="relative w-[250px]">
                <img
                  src={media.housekeepingApp.url}
                  width={media.housekeepingApp.width}
                  height={media.housekeepingApp.height}
                  alt={c.media.alt.housekeepingApp}
                  loading="lazy"
                  className="block h-auto w-full"
                />
              </PhoneFrame>
            </Reveal>
            <Reveal delay={60} className="text-cream">
              <Eyebrow tone="dark">{c.morning.eyebrow}</Eyebrow>
              <h2 className="text-cream">
                <Signature text={c.morning.h2} />
              </h2>
              <p className="measure mt-5 text-cream/80">{c.morning.lede}</p>
              <PointList points={c.morning.points} tone="dark" />
            </Reveal>
          </div>
        </section>

        {/* 5. The paperwork */}
        <section className="section-y bg-cream">
          <div className="container-page grid items-center gap-14 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>{c.paperwork.eyebrow}</Eyebrow>
              <h2>
                <Signature text={c.paperwork.h2} />
              </h2>
              <p className="measure mt-5 text-ink-soft">{c.paperwork.lede}</p>
              <PointList points={c.paperwork.points} />
            </Reveal>
            <Reveal delay={60} className="flex justify-center">
              <div className="card-lift rotate-2 rounded-2xl bg-white p-4 shadow-[0_24px_60px_-45px_rgba(8,32,30,0.55)]">
                <img
                  src={media.invoice.url}
                  width={media.invoice.width}
                  height={media.invoice.height}
                  alt={c.media.alt.invoice}
                  loading="lazy"
                  className="block h-auto w-full max-w-[460px] rounded-xl"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* 6. Your booking channel */}
        <section className="section-y bg-teal-900">
          <div className="container-page">
            <Reveal className="text-cream">
              <Eyebrow tone="dark">{c.channel.eyebrow}</Eyebrow>
              <h2 className="text-cream">
                <Signature text={c.channel.h2} />
              </h2>
              <p className="measure mt-5 text-cream/80">{c.channel.lede}</p>
            </Reveal>
            <Reveal delay={60} className="mt-12 flex justify-center">
              <div className="w-full max-w-[900px] rounded-3xl bg-cream/10 p-3 shadow-[0_0_120px_-40px_rgba(247,242,231,0.65)]">
                <BrowserFrame url={c.media.browserUrl}>
                  <img
                    src={media.bookingSite.url}
                    width={media.bookingSite.width}
                    height={media.bookingSite.height}
                    alt={c.media.alt.bookingSite}
                    loading="lazy"
                    className="block h-auto w-full"
                  />
                </BrowserFrame>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <p className="measure mx-auto mt-8 text-center text-[0.92rem] text-cream/70">{c.channel.note}</p>
            </Reveal>
          </div>
        </section>

        {/* 7. Segments */}
        <section className="section-y bg-cream-deep">
          <div className="container-page">
            <Reveal>
              <SectionHead
                eyebrow={c.segments.eyebrow}
                h2={c.segments.h2}
                cta={{ href: demoHref, label: c.nav.cta }}
              />
            </Reveal>
            <Reveal delay={60} className="mt-10">
              <SegmentsCarousel lang={lang} />
            </Reveal>
          </div>
        </section>

        {/* 8. CTA band */}
        <section className="bg-teal-700 py-14">
          <div className="container-page flex flex-col items-center gap-6 text-center">
            <p className="max-w-[42ch] font-display text-3xl text-cream">{c.ctaBand.text}</p>
            <CtaLink href={demoHref} tone="cream">
              {c.ctaBand.button}
            </CtaLink>
          </div>
        </section>

        {/* 9. What you get */}
        <section className="section-y bg-white">
          <div className="container-page">
            <Reveal>
              <SectionHead
                eyebrow={c.included.eyebrow}
                h2={c.included.h2}
                lede={c.included.lede}
                cta={{ href: demoHref, label: c.nav.cta }}
              />
            </Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <Reveal delay={60}>
                <article className="card-lift flex h-full flex-col rounded-2xl border border-ink/12 bg-white p-8">
                  <h3>{c.included.left.title}</h3>
                  <p className="mt-2 text-[0.9rem] text-ink-soft">{c.included.left.sub}</p>
                  <ul className="mt-6 space-y-3">
                    {c.included.left.items.map((item) => (
                      <li key={item} className="flex gap-3 text-[0.95rem] text-ink-soft">
                        <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-teal-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
              <Reveal delay={120}>
                <article className="card-lift flex h-full flex-col rounded-2xl border border-amber/40 bg-cream-deep p-8">
                  <h3>{c.included.right.title}</h3>
                  <p className="mt-2 text-[0.9rem] text-ink-soft">{c.included.right.sub}</p>
                  <ul className="mt-6 space-y-3">
                    {c.included.right.items.map((item) => (
                      <li key={item} className="flex gap-3 text-[0.95rem] text-ink-soft">
                        <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-teal-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        {/* 10. Fit */}
        <section id="fit" className="section-y bg-cream">
          <div className="container-page">
            <Reveal>
              <Eyebrow>{c.fit.eyebrow}</Eyebrow>
              <h2>
                <Signature text={c.fit.h2} />
              </h2>
              <p className="measure mt-5 text-ink-soft">{c.fit.lede}</p>
            </Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <Reveal delay={60}>
                <article className="card-lift h-full rounded-2xl border border-ink/10 bg-white p-8">
                  <h3>{c.fit.yesTitle}</h3>
                  <ul className="mt-6 space-y-3">
                    {c.fit.yes.map((item) => (
                      <li key={item} className="flex gap-3 text-[0.95rem] text-ink-soft">
                        <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-teal-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
              <Reveal delay={120}>
                <article className="card-lift h-full rounded-2xl border border-ink/10 bg-cream-deep p-8">
                  <h3>{c.fit.noTitle}</h3>
                  <ul className="mt-6 space-y-3">
                    {c.fit.no.map((item) => (
                      <li key={item} className="flex gap-3 text-[0.95rem] text-ink-soft">
                        <X aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink/35" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        {/* 11. Getting started */}
        <section className="section-y bg-teal-900">
          <div className="container-page">
            <Reveal className="text-cream">
              <Eyebrow tone="dark">{c.start.eyebrow}</Eyebrow>
              <h2 className="text-cream">
                <Signature text={c.start.h2} />
              </h2>
              <p className="measure mt-5 text-cream/80">{c.start.lede}</p>
            </Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {c.start.steps.map((step, i) => (
                <Reveal key={step.title} delay={60 * (i + 1)}>
                  <article className="card-lift relative h-full overflow-hidden rounded-2xl border border-cream/15 bg-teal-800 p-8">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-4 top-0 font-display text-[6rem] leading-none text-amber/20"
                    >
                      {i + 1}
                    </span>
                    <h3 className="relative text-cream">{step.title}</h3>
                    <p className="relative mt-4 text-[0.95rem] text-cream/80">{step.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
            <div className="mt-10">
              <CtaLink href={demoHref} tone="cream">
                {c.start.cta}
              </CtaLink>
            </div>
          </div>
        </section>

        {/* 12. Demo */}
        <section id="demo" className="section-y bg-cream-deep">
          <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.1fr]">
            <Reveal>
              <Eyebrow>{c.demo.eyebrow}</Eyebrow>
              <h2>
                <Signature text={c.demo.h2} />
              </h2>
              <p className="measure mt-5 text-ink-soft">{c.demo.lede}</p>
              <ul className="mt-8 space-y-2 text-[0.95rem] text-ink-soft">
                {c.demo.facts.map((fact) => (
                  <li key={fact}>
                    {fact.includes("@") ? (
                      <a href="mailto:hello@revoo.site" className="text-teal-500 hover:text-teal-700">
                        {fact}
                      </a>
                    ) : (
                      fact
                    )}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={60}>
              <DemoForm lang={lang} />
            </Reveal>
          </div>
        </section>

        {/* 13. FAQ */}
        <section id="faq" className="section-y bg-white">
          <div className="container-page">
            <Reveal className="mx-auto max-w-[820px] text-center">
              <Eyebrow>{c.faq.eyebrow}</Eyebrow>
              <h2>
                <Signature text={c.faq.h2} />
              </h2>
            </Reveal>
            <Reveal delay={60} className="mt-10">
              <Faq lang={lang} />
            </Reveal>
          </div>
        </section>
      </main>

      <Footer lang={lang} altHref={altHref} />
      <MobileCtaBar lang={lang} />
    </div>
  );
}

function SectionHead({
  eyebrow,
  h2,
  lede,
  cta,
  tone = "light",
}: {
  eyebrow: string;
  h2: string;
  lede?: string;
  cta?: { href: string; label: string };
  tone?: "light" | "dark";
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div>
        <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
        <h2 className={tone === "dark" ? "text-cream" : undefined}>
          <Signature text={h2} />
        </h2>
        {lede ? (
          <p className={`measure mt-5 ${tone === "dark" ? "text-cream/80" : "text-ink-soft"}`}>{lede}</p>
        ) : null}
      </div>
      {cta ? (
        <div className="shrink-0">
          <CtaLink href={cta.href} tone={tone === "dark" ? "cream" : "outline"} size="sm">
            {cta.label}
          </CtaLink>
        </div>
      ) : null}
    </div>
  );
}

function PointList({ points, tone = "light" }: { points: readonly string[]; tone?: "light" | "dark" }) {
  return (
    <ul className="mt-8 space-y-3">
      {points.map((point) => (
        <li
          key={point}
          className={`flex gap-3 text-[0.95rem] ${tone === "dark" ? "text-cream/80" : "text-ink-soft"}`}
        >
          <Check
            aria-hidden="true"
            className={`mt-1 h-4 w-4 shrink-0 ${tone === "dark" ? "text-amber" : "text-teal-500"}`}
          />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}
