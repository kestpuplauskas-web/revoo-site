import { createFileRoute } from "@tanstack/react-router";

import { FeaturesIndexPage } from "@/components/site/FeaturePage";
import { featureCopy, featurePath } from "@/content/features";
import { absUrl, breadcrumbLd, buildHead, copyHead, organizationLd } from "@/lib/i18n";

export const Route = createFileRoute("/lt/funkcijos/")({
  head: () => {
    const fc = featureCopy.lt;
    return buildHead({
      lang: "lt",
      title: fc.indexMetaTitle,
      description: fc.indexMetaDescription,
      path: "funkcijos",
      altPath: "features",
      jsonLd: [
        organizationLd(),
        breadcrumbLd([
          { name: copyHead.lt.home, url: absUrl("lt") },
          { name: fc.indexTitle, url: absUrl("lt", "funkcijos") },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: fc.items.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.card,
            url: absUrl("lt", featurePath("lt", item.slug)),
          })),
        },
      ],
    });
  },
  component: () => <FeaturesIndexPage lang="lt" />,
});
