import { ArrowDown, ArrowRight, Check } from "lucide-react";
import type { Copy } from "@/content/copy.types";
import type { SlotMedia } from "@/content/media-slots";
import { demoCtaHref } from "@/lib/trial";
import { CtaLink, SignatureUnderlined } from "./primitives";

export function TrialHero({ copy: c, image }: { copy: Copy; image: SlotMedia }) {
  return (
    <section className="trial-hero bg-primary text-primary-foreground">
      <div className="container-page pt-28 text-center lg:pt-32">
        <p className="eyebrow text-amber-light">{c.hero.eyebrow}</p>
        <h1 className="trial-title mx-auto mt-5 max-w-[820px]">
          <SignatureUnderlined text={c.hero.h1} />
        </h1>
        <p className="mx-auto mt-5 max-w-[660px] text-base leading-relaxed text-primary-foreground/90 sm:text-lg">{c.hero.sub}</p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <CtaLink href={demoCtaHref("en")} tone="cream" className="min-h-12 gap-3">
            {c.hero.primary}<ArrowRight aria-hidden="true" className="h-4 w-4" />
          </CtaLink>
          <a href="#product" className="inline-flex min-h-11 items-center gap-2 px-3 text-sm underline underline-offset-4">
            {c.hero.secondary}<ArrowDown aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
        <p className="mt-4 text-sm text-primary-foreground/90">{c.hero.status}</p>
        <div className="mx-auto mt-9 max-w-[1060px] overflow-hidden rounded-t-lg border border-primary-foreground/20">
          <img src={image.url} alt={c.media.alt.calendar} width={image.width} height={image.height}
            fetchPriority="high" className="block h-auto w-full" />
        </div>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-10 gap-y-3 border-t border-primary-foreground/15 bg-teal-900 px-6 py-5">
        {c.pricing.badges.map((badge) => <li key={badge} className="flex items-center gap-2 text-sm">
          <Check aria-hidden="true" className="h-4 w-4 text-amber-light" />{badge}
        </li>)}
      </ul>
    </section>
  );
}