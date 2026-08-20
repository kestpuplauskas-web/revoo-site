import { createFileRoute } from "@tanstack/react-router";

import { BlogList } from "@/components/site/BlogList";
import { copy } from "@/content/copy";
import { buildHead, organizationLd } from "@/lib/i18n";

export const Route = createFileRoute("/blog/")({
  head: () =>
    buildHead({
      lang: "en",
      title: copy.en.blog.metaTitle,
      description: copy.en.blog.metaDescription,
      path: "blog",
      jsonLd: [organizationLd()],
    }),
  component: () => <BlogList lang="en" />,
});
