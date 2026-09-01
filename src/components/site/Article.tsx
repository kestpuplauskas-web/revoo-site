import { BlogCta } from "./BlogList";
import { Footer } from "./Footer";
import { Header } from "./Header";
import type { Post } from "@/content/posts";
import { href, t, type Lang } from "@/lib/i18n";

export function Article({ lang, post }: { lang: Lang; post: Post }) {
  const c = t(lang);
  const altHref = lang === "en" ? "/lt/blog/" : "/blog/";

  return (
    <div className="min-h-screen bg-cream">
      <Header lang={lang} altHref={altHref} />
      <main className="pt-[68px]">
        <article className="section-y">
          <div className="container-page">
            <nav aria-label="Breadcrumb" className="mb-8 text-[0.85rem] text-ink-soft">
              <a href={href(lang)} className="hover:text-teal-500">
                {c.nav.home}
              </a>
              <span aria-hidden="true"> / </span>
              <a href={href(lang, "blog")} className="hover:text-teal-500">
                {c.blog.title}
              </a>
            </nav>

            <div className="mx-auto max-w-[760px]">
              <p className="eyebrow text-teal-500">
                <time dateTime={post.date}>{post.date}</time> · {post.readingTime}{" "}
                {c.blog.readingTime}
              </p>
              <h1 className="mt-4">{post.h1}</h1>

              <div className="mt-10 space-y-6">
                {post.blocks.map((block, i) => {
                  if (block.type === "h2") {
                    return (
                      <h2 key={i} className="pt-4 text-3xl">
                        {block.text}
                      </h2>
                    );
                  }
                  if (block.type === "p") {
                    return (
                      <p key={i} className="text-[1.02rem] leading-[1.75] text-ink-soft">
                        {block.text}
                      </p>
                    );
                  }
                  if (block.type === "image") {
                    return (
                      <figure key={i} className="my-8">
                        <img
                          src={block.src}
                          alt={block.alt}
                          loading="lazy"
                          className="w-full rounded-2xl border border-ink/10"
                        />
                        {block.caption ? (
                          <figcaption className="mt-3 text-[0.85rem] text-ink-soft">
                            {block.caption}
                          </figcaption>
                        ) : null}
                      </figure>
                    );
                  }
                  const items = block.items.map((item, j) => (
                    <li key={j} className="text-[1.02rem] leading-[1.7] text-ink-soft">
                      {item}
                    </li>
                  ));
                  return block.type === "ul" ? (
                    <ul key={i} className="list-disc space-y-2 pl-6 marker:text-teal-500">
                      {items}
                    </ul>
                  ) : (
                    <ol key={i} className="list-decimal space-y-2 pl-6 marker:text-teal-500">
                      {items}
                    </ol>
                  );
                })}
              </div>


              <p className="mt-10 border-l-2 border-amber pl-4 text-[0.88rem] italic text-ink-soft">
                {c.blog.disclaimer}
              </p>

              <p className="mt-10">
                <a href={href(lang, "blog")} className="text-teal-500 hover:text-teal-700">
                  ← {c.blog.back}
                </a>
              </p>

              <BlogCta lang={lang} />
            </div>
          </div>
        </article>
      </main>
      <Footer lang={lang} altHref={altHref} />
    </div>
  );
}
