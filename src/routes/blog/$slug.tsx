import { createFileRoute, notFound } from "@tanstack/react-router";

import { Article } from "@/components/site/Article";
import { findPost } from "@/content/posts";
import { absUrl, blogPostingLd, breadcrumbLd, buildHead, copyHead, organizationLd } from "@/lib/i18n";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = findPost("en", params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const url = absUrl("en", `blog/${loaderData.slug}`);
    return buildHead({
      lang: "en",
      title: loaderData.metaTitle,
      description: loaderData.metaDescription,
      path: `blog/${loaderData.slug}`,
      altPath: null,
      jsonLd: [
        organizationLd(),
        blogPostingLd({
          lang: "en",
          headline: loaderData.h1,
          description: loaderData.metaDescription,
          datePublished: loaderData.date,
          url,
        }),
        breadcrumbLd([
          { name: copyHead.en.home, url: absUrl("en") },
          { name: copyHead.en.blog, url: absUrl("en", "blog") },
          { name: loaderData.title, url },
        ]),
      ],
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const post = Route.useLoaderData();
  return <Article lang="en" post={post} />;
}
