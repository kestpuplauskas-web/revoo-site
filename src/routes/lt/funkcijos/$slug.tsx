import { createFileRoute, notFound } from "@tanstack/react-router";

import { FeatureDetailPage } from "@/components/site/FeaturePage";
import { featureCopy, featurePath, getFeature, featureSlugByKey } from "@/content/features";
import { absUrl, breadcrumbLd, buildHead, copyHead, faqLd, organizationLd } from "@/lib/i18n";

export const Route = createFileRoute("/lt/funkcijos/$slug")({
  loader: ({ params }) => {
    const feature = getFeature("lt", params.slug);
    if (!feature) throw notFound();
    return { feature };
  },
  head: ({ params }) => {
    const feature = getFeature("lt", params.slug);
    const fc = featureCopy.lt;
    if (!feature) {
      return { meta: [{ title: "Puslapis nerastas" }, { name: "robots", content: "noindex" }] };
    }
    const path = featurePath("lt", feature.slug);
    const altSlug = featureSlugByKey("en", feature.key);
    return buildHead({
      lang: "lt",
      title: feature.metaTitle,
      description: feature.metaDescription,
      path,
      altPath: altSlug ? featurePath("en", altSlug) : null,
      jsonLd: [
        organizationLd(),
        breadcrumbLd([
          { name: copyHead.lt.home, url: absUrl("lt") },
          { name: fc.indexTitle, url: absUrl("lt", "funkcijos") },
          { name: feature.card, url: absUrl("lt", path) },
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
  return <FeatureDetailPage lang="lt" feature={feature} />;
}

function NotFoundState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
      <p className="text-ink-soft">Šis puslapis nepasiekiamas.</p>
    </main>
  );
}
