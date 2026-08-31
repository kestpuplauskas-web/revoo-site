import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/components/site/HomePage";
import { copy } from "@/content/copy";
import { buildHead, faqLd, homeSeo, organizationLd, softwareApplicationLd } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => {
    const h = buildHead({
      lang: "en",
      title: homeSeo.en.title,
      description: homeSeo.en.description,
      jsonLd: [organizationLd(), softwareApplicationLd(), faqLd(copy.en.faq.items)],
    });
    return {
      ...h,
      links: [
        ...h.links,
        { rel: "preload", as: "image", href: "/media/6_booking.webp", fetchpriority: "high" },
      ],
    };
  },
  component: () => <HomePage lang="en" />,
});
