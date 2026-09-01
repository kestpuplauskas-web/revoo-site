import { Footer } from "./Footer";
import { Header } from "./Header";
import { CtaLink, Eyebrow, Reveal, Signature } from "./primitives";
import type { PostListItem } from "@/content/posts";
import { href, t, type Lang } from "@/lib/i18n";

export function BlogList({ lang, items }: { lang: Lang; items: PostListItem[] }) {
  const c = t(lang);
  const altHref = lang === "en" ? "/lt/blog/" : "/blog/";

  return (
    <div className="min-h-screen bg-cream">
      <Header lang={lang} altHref={altHref} />
      <main className="pt-[68px]">
        <section className="section-y bg-teal-700">
          <div className="container-page">
            <Eyebrow tone="dark">{c.blog.eyebrow}</Eyebrow>
            <h1 className="text-cream">
              <Signature text={c.blog.h2} />
            </h1>
            <p className="measure mt-6 text-cream/85">{c.blog.lede}</p>
          </div>
        </section>

        <section className="section-y">
          <div className="container-page grid gap-6 md:grid-cols-2">
            {items.map((post, i) => (
              <Reveal key={post.slug} delay={60 * i}>
                <article className="card-lift flex h-full flex-col rounded-2xl border border-ink/10 bg-white p-8">
                  <p className="eyebrow text-teal-500">
                    <time dateTime={post.date}>{post.date}</time> · {post.readingTime}{" "}
                    {c.blog.readingTime}
                  </p>
                  <h2 className="mt-4 text-2xl">
                    <a
                      href={href(lang, `blog/${post.slug}`)}
                      className="transition-colors hover:text-teal-500"
                    >
                      {post.title}
                    </a>
                  </h2>
                  <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">{post.excerpt}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <Footer lang={lang} altHref={altHref} />
    </div>
  );
}

export function BlogCta({ lang }: { lang: Lang }) {
  const c = t(lang);
  return (
    <div className="mt-14 rounded-3xl bg-teal-700 p-8 text-cream sm:p-10">
      <h2 className="text-cream">{c.blog.ctaTitle}</h2>
      <p className="measure mt-4 text-cream/85">{c.blog.ctaBody}</p>
      <div className="mt-7">
        <CtaLink href={`${href(lang)}#demo`} tone="cream">
          {c.blog.ctaButton}
        </CtaLink>
      </div>
    </div>
  );
}
