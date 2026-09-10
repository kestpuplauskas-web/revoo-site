import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";

import { Footer } from "./Footer";
import { Header } from "./Header";
import { CtaLink, Eyebrow, Reveal, Signature, SignatureUnderlined } from "./primitives";
import { featureCopy, featureHref, featureSlugByKey, type Feature } from "@/content/features";
import { href, type Lang } from "@/lib/i18n";

function altFeatureHref(lang: Lang, feature: Feature): string {
  const other: Lang = lang === "en" ? "lt" : "en";
  const slug = featureSlugByKey(other, feature.key);
  return slug ? featureHref(other, slug) : featureHref(other);
}

export function FeatureDetailPage({ lang, feature }: { lang: Lang; feature: Feature }) {
  const fc = featureCopy[lang];
  const demoHref = `${href(lang)}#demo`;

  return (
    <div className="min-h-screen bg-cream">
      <Header lang={lang} altHref={altFeatureHref(lang, feature)} />

      <main>
        <section className="bg-teal-900 pb-20 pt-28 text-cream">
          <div className="container-page">
            <Link
              to={featureHref(lang)}
              className="inline-flex items-center gap-2 text-[0.9rem] text-cream/70 transition-colors hover:text-cream"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {fc.back}
            </Link>
            <div className="mt-8 max-w-3xl">
              <Eyebrow tone="dark">{feature.eyebrow}</Eyebrow>
              <h1 className="mt-4 text-cream">
                <SignatureUnderlined text={feature.h1} />
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-cream/80">{feature.lede}</p>
              <CtaLink href={demoHref} className="mt-8" tone="cream">
                {fc.ctaButton}
              </CtaLink>
            </div>
          </div>
        </section>

        <section className="section-y bg-cream">
          <div className="container-page grid gap-14">
            {feature.sections.map((section, i) => (
              <Reveal key={section.h2} delay={40 * i}>
                <article className="grid gap-6 md:grid-cols-[1fr_1.1fr] md:gap-12">
                  <h2 className="text-balance">
                    <Signature text={section.h2} />
                  </h2>
                  <div>
                    <p className="text-[1.05rem] leading-relaxed text-ink-soft">{section.body}</p>
                    <ul className="mt-6 space-y-3">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3 text-[0.98rem] leading-relaxed">
                          <Check className="mt-1 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {feature.faq.length > 0 && (
          <section className="section-y bg-teal-900 text-cream">
            <div className="container-page">
              <h2 className="text-cream">FAQ</h2>
              <dl className="mt-10 grid gap-8 md:grid-cols-2">
                {feature.faq.map((item) => (
                  <div key={item.q} className="rounded-2xl border border-cream/15 bg-teal-800 p-7">
                    <dt className="font-display text-xl text-cream">{item.q}</dt>
                    <dd className="mt-3 text-[0.95rem] leading-relaxed text-cream/80">{item.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        <section className="section-y bg-cream">
          <div className="container-page">
            <h2 className="sr-only">{fc.keywordsTitle}</h2>
            <p className="eyebrow text-ink-soft">{fc.keywordsTitle}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {feature.keywords.map((kw) => (
                <li
                  key={kw}
                  className="rounded-full border border-ink/15 px-4 py-1.5 text-[0.85rem] text-ink-soft"
                >
                  {kw}
                </li>
              ))}
            </ul>

            <div className="mt-14 rounded-3xl bg-teal-900 p-10 text-cream md:p-14">
              <h2 className="text-cream">{fc.ctaTitle}</h2>
              <p className="mt-4 max-w-xl text-cream/80">{fc.ctaBody}</p>
              <CtaLink href={demoHref} className="mt-8" tone="cream">
                {fc.ctaButton}
              </CtaLink>
            </div>

            <nav className="mt-16" aria-label={fc.indexTitle}>
              <p className="eyebrow text-ink-soft">{fc.indexTitle}</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {fc.items
                  .filter((item) => item.key !== feature.key)
                  .map((item) => (
                    <li key={item.key}>
                      <Link
                        to={featureHref(lang, item.slug)}
                        className="text-[0.98rem] underline underline-offset-4 transition-colors hover:text-amber"
                      >
                        {item.card}
                      </Link>
                    </li>
                  ))}
              </ul>
            </nav>
          </div>
        </section>
      </main>

      <Footer lang={lang} altHref={altFeatureHref(lang, feature)} />
    </div>
  );
}

export function FeaturesIndexPage({ lang }: { lang: Lang }) {
  const fc = featureCopy[lang];
  const alt = lang === "en" ? featureHref("lt") : featureHref("en");

  return (
    <div className="min-h-screen bg-cream">
      <Header lang={lang} altHref={alt} />
      <main>
        <section className="bg-teal-900 pb-20 pt-28 text-cream">
          <div className="container-page max-w-3xl">
            <Eyebrow tone="dark">{fc.indexEyebrow}</Eyebrow>
            <h1 className="mt-4 text-cream">
              <SignatureUnderlined text={fc.indexH1} />
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-cream/80">{fc.indexLede}</p>
          </div>
        </section>

        <section className="section-y bg-cream">
          <div className="container-page grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fc.items.map((item, i) => (
              <Reveal key={item.key} delay={40 * i}>
                <Link
                  to={featureHref(lang, item.slug)}
                  className="card-lift flex h-full flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-7"
                >
                  <h2 className="font-display text-2xl">{item.card}</h2>
                  <p className="text-[0.95rem] leading-relaxed text-ink-soft">{item.lede}</p>
                  <span className="mt-auto pt-4 text-[0.9rem] text-teal-700 underline underline-offset-4">
                    {fc.more}
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <Footer lang={lang} altHref={alt} />
    </div>
  );
}
