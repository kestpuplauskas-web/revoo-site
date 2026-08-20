import { createFileRoute } from "@tanstack/react-router";

import { BlogList } from "@/components/site/BlogList";
import { copy } from "@/content/copy";
import { buildHead, organizationLd } from "@/lib/i18n";

export const Route = createFileRoute("/lt/blog/")({
  head: () =>
    buildHead({
      lang: "lt",
      title: copy.lt.blog.metaTitle,
      description: copy.lt.blog.metaDescription,
      path: "blog",
      jsonLd: [organizationLd()],
    }),
  component: () => <BlogList lang="lt" />,
});
