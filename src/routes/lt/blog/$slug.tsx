import { createFileRoute, notFound } from "@tanstack/react-router";

import { Article } from "@/components/site/Article";
import { findPost } from "@/content/posts";
import { absUrl, blogPostingLd, breadcrumbLd, buildHead, copyHead, organizationLd } from "@/lib/i18n";

export const Route = createFileRoute("/lt/blog/$slug")({
  loader: ({ params }) => {
    const post = findPost("lt", params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const url = absUrl("lt", `blog/${loaderData.slug}`);
    return buildHead({
      lang: "lt",
      title: loaderData.metaTitle,
      description: loaderData.metaDescription,
      path: `blog/${loaderData.slug}`,
      altPath: null,
      jsonLd: [
        organizationLd(),
        blogPostingLd({
          lang: "lt",
          headline: loaderData.h1,
          description: loaderData.metaDescription,
          datePublished: loaderData.date,
          url,
        }),
        breadcrumbLd([
          { name: copyHead.lt.home, url: absUrl("lt") },
          { name: copyHead.lt.blog, url: absUrl("lt", "blog") },
          { name: loaderData.title, url },
        ]),
      ],
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const post = Route.useLoaderData();
  return <Article lang="lt" post={post} />;
}
