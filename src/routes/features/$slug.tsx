import { createFileRoute, notFound } from "@tanstack/react-router";

import { FeatureDetailPage } from "@/components/site/FeaturePage";
import { featureCopy, featurePath, getFeature, featureSlugByKey } from "@/content/features";
import { absUrl, breadcrumbLd, buildHead, copyHead, faqLd, organizationLd } from "@/lib/i18n";

export const Route = createFileRoute("/features/$slug")({
  loader: ({ params }) => {
    const feature = getFeature("en", params.slug);
    if (!feature) throw notFound();
    return { feature };
  },
  head: ({ params }) => {
    const feature = getFeature("en", params.slug);
    const fc = featureCopy.en;
    if (!feature) {
      return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    }
    const path = featurePath("en", feature.slug);
    const altSlug = featureSlugByKey("lt", feature.key);
    return buildHead({
      lang: "en",
      title: feature.metaTitle,
      description: feature.metaDescription,
      path,
      altPath: altSlug ? featurePath("lt", altSlug) : null,
      jsonLd: [
        organizationLd(),
        breadcrumbLd([
          { name: copyHead.en.home, url: absUrl("en") },
          { name: fc.indexTitle, url: absUrl("en", "features") },
          { name: feature.card, url: absUrl("en", path) },
        ]),
        ...(feature.faq.length ? [faqLd(feature.faq)] : []),
      ],
    });
  },
  notFoundComponent: () => <NotFoundState />,
  errorComponent: () => <NotFoundState />,
  component: RouteComponent,
});

function RouteComponent() {
  const { feature } = Route.useLoaderData();
  return <FeatureDetailPage lang="en" feature={feature} />;
}

function NotFoundState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
      <p className="text-ink-soft">This page is not available.</p>
    </main>
  );
}
