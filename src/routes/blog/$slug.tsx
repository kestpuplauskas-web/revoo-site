import { createFileRoute, notFound } from "@tanstack/react-router";

import { Article } from "@/components/site/Article";
import { absUrl, blogPostingLd, breadcrumbLd, buildHead, copyHead, organizationLd } from "@/lib/i18n";
import { getPublishedPost } from "@/lib/posts.functions";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const { post, altSlug } = await getPublishedPost({ data: { lang: "en", slug: params.slug } });
    if (!post) throw notFound();
    return { post, altSlug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const { post, altSlug } = loaderData;
    const url = absUrl("en", `blog/${post.slug}`);
    return buildHead({
      lang: "en",
      title: post.metaTitle,
      description: post.metaDescription,
      path: `blog/${post.slug}`,
      altPath: altSlug ? `blog/${altSlug}` : null,
      ogType: "article",
      jsonLd: [
        organizationLd(),
        blogPostingLd({
          lang: "en",
          headline: post.h1,
          description: post.metaDescription,
          datePublished: post.date,
          url,
        }),
        breadcrumbLd([
          { name: copyHead.en.home, url: absUrl("en") },
          { name: copyHead.en.blog, url: absUrl("en", "blog") },
          { name: post.title, url },
        ]),
      ],
    });
  },
  errorComponent: () => <ErrorState />,
  notFoundComponent: () => <ErrorState />,
  component: RouteComponent,
});

function RouteComponent() {
  const { post } = Route.useLoaderData();
  return <Article lang="en" post={post} />;
}

function ErrorState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
      <p className="text-ink-soft">This article is not available.</p>
    </main>
  );
}
