import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

import { t, type Lang } from "@/lib/i18n";
import type { Copy } from "@/content/copy.types";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function SegmentsCarousel({ lang, copy }: { lang: Lang; copy?: Copy }) {
  const c = copy ?? t(lang);
  const slides = c.segments.slides;
  const isMobile = useIsMobile();
  const visibleCount = isMobile ? 1 : 2;
  const pageCount = Math.ceil(slides.length / visibleCount);
  const [index, setIndex] = useState(0);

  const go = (next: number) => setIndex((next + pageCount) % pageCount);

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={c.segments.h2.replace(/\*/g, "")}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(index + 1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(index - 1);
        }
      }}
    >
      <div className="mb-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label={c.segments.prev}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 bg-white text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-700"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label={c.segments.next}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 bg-white text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-700"
        >
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0b302e_0%,#15544e_58%,#2c8075_100%)]">
        <div
          className="flex min-h-[380px] transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, slideIndex) => {
            const firstVisible = index * visibleCount;
            const isVisible = slideIndex >= firstVisible && slideIndex < firstVisible + visibleCount;

            return (
            <article
              key={slide.title}
              aria-hidden={!isVisible}
              className="flex w-full shrink-0 items-center p-5 sm:p-8 md:w-1/2 md:p-10"
            >
              <div className="flex min-h-[260px] w-full flex-col justify-center rounded-2xl border border-white/20 bg-white/[0.12] p-7 backdrop-blur-md sm:p-8">
                <h3 className="font-display text-3xl text-cream">{slide.title}</h3>
                <p className="mt-4 text-[0.98rem] leading-relaxed text-cream/85">{slide.body}</p>
              </div>
            </article>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {Array.from({ length: pageCount }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${c.segments.goTo}: ${slides[i * visibleCount]?.title ?? i + 1}`}
            aria-current={i === index}
            className={cn(
              "h-2.5 rounded-full transition-all duration-200",
              i === index ? "w-8 bg-amber" : "w-2.5 bg-ink/20 hover:bg-ink/35",
            )}
          />
        ))}
      </div>
    </div>
  );
}
