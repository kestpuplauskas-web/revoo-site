import { createFileRoute } from "@tanstack/react-router";

import { BlogList } from "@/components/site/BlogList";
import { copy } from "@/content/copy";
import { buildHead, organizationLd } from "@/lib/i18n";
import { listPublishedPosts } from "@/lib/posts.functions";

export const Route = createFileRoute("/blog/")({
  loader: () => listPublishedPosts({ data: { lang: "en" } }),
  head: () =>
    buildHead({
      lang: "en",
      title: copy.en.blog.metaTitle,
      description: copy.en.blog.metaDescription,
      path: "blog",
      jsonLd: [organizationLd()],
    }),
  errorComponent: () => <ErrorState />,
  notFoundComponent: () => <ErrorState />,
  component: RouteComponent,
});

function RouteComponent() {
  const { posts } = Route.useLoaderData();
  return <BlogList lang="en" items={posts} />;
}

function ErrorState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
      <p className="text-ink-soft">The journal is unavailable right now. Please try again.</p>
    </main>
  );
}
