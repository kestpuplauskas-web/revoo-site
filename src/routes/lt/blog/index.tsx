import { createFileRoute } from "@tanstack/react-router";

import { BlogList } from "@/components/site/BlogList";
import { copy } from "@/content/copy";
import { buildHead, organizationLd } from "@/lib/i18n";
import { listPublishedPosts } from "@/lib/posts.functions";

export const Route = createFileRoute("/lt/blog/")({
  loader: () => listPublishedPosts({ data: { lang: "lt" } }),
  head: () =>
    buildHead({
      lang: "lt",
      title: copy.lt.blog.metaTitle,
      description: copy.lt.blog.metaDescription,
      path: "blog",
      jsonLd: [organizationLd()],
    }),
  errorComponent: () => <ErrorState />,
  notFoundComponent: () => <ErrorState />,
  component: RouteComponent,
});

function RouteComponent() {
  const { posts } = Route.useLoaderData();
  return <BlogList lang="lt" items={posts} />;
}

function ErrorState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
      <p className="text-ink-soft">Straipsnių šiuo metu parodyti nepavyko. Bandykite dar kartą.</p>
    </main>
  );
}
