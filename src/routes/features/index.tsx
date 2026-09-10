import { createFileRoute } from "@tanstack/react-router";

import { FeaturesIndexPage } from "@/components/site/FeaturePage";
import { featureCopy, featurePath } from "@/content/features";
import { absUrl, breadcrumbLd, buildHead, copyHead, organizationLd } from "@/lib/i18n";

export const Route = createFileRoute("/features/")({
  head: () => {
    const fc = featureCopy.en;
    return buildHead({
      lang: "en",
      title: fc.indexMetaTitle,
      description: fc.indexMetaDescription,
      path: "features",
      altPath: "funkcijos",
      jsonLd: [
        organizationLd(),
        breadcrumbLd([
          { name: copyHead.en.home, url: absUrl("en") },
          { name: fc.indexTitle, url: absUrl("en", "features") },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: fc.items.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.card,
            url: absUrl("en", featurePath("en", item.slug)),
          })),
        },
      ],
    });
  },
  component: () => <FeaturesIndexPage lang="en" />,
});
