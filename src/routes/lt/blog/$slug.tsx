import { createFileRoute, getRouteApi, notFound } from "@tanstack/react-router";

import { Article } from "@/components/site/Article";
import { absUrl, blogPostingLd, breadcrumbLd, buildHead, copyHead, organizationLd } from "@/lib/i18n";
import { getPublishedPost } from "@/lib/posts.functions";

export const Route = createFileRoute("/lt/blog/$slug")({
  loader: async ({ params }) => {
    const { post, altSlug } = await getPublishedPost({ data: { lang: "lt", slug: params.slug } });
    if (!post) throw notFound();
    return { post, altSlug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Puslapis nepasiekiamas" }, { name: "robots", content: "noindex" }] };
    }
    const { post, altSlug } = loaderData;
    const url = absUrl("lt", `blog/${post.slug}`);
    return buildHead({
      lang: "lt",
      title: post.metaTitle,
      description: post.metaDescription,
      path: `blog/${post.slug}`,
      altPath: altSlug ? `blog/${altSlug}` : null,
      ogType: "article",
      jsonLd: [
        organizationLd(),
        blogPostingLd({
          lang: "lt",
          headline: post.h1,
          description: post.metaDescription,
          datePublished: post.date,
          url,
        }),
        breadcrumbLd([
          { name: copyHead.lt.home, url: absUrl("lt") },
          { name: copyHead.lt.blog, url: absUrl("lt", "blog") },
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
  const { post } = getRouteApi("/lt/blog/$slug").useLoaderData();
  return <Article lang="lt" post={post} />;
}

function ErrorState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
      <p className="text-ink-soft">Šis straipsnis nepasiekiamas.</p>
    </main>
  );
}
