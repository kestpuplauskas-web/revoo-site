import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function SegmentsCarousel({ lang }: { lang: Lang }) {
  const c = t(lang);
  const slides = c.segments.slides;
  const [index, setIndex] = useState(0);

  const go = (next: number) => setIndex((next + slides.length) % slides.length);

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

      <div className="overflow-hidden rounded-3xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide) => (
            <article
              key={slide.title}
              aria-hidden={slides[index]?.title !== slide.title}
              className="w-full shrink-0 px-0"
            >
              <div className="flex min-h-[380px] flex-col justify-end rounded-3xl bg-[linear-gradient(135deg,#0b302e_0%,#15544e_58%,#2c8075_100%)] p-6 sm:p-10 md:flex-row md:items-center md:justify-end">
                <div className="w-full rounded-2xl border border-white/20 bg-white/[0.12] p-7 backdrop-blur-md md:max-w-[430px]">
                  <h3 className="font-display text-3xl text-cream">{slide.title}</h3>
                  <p className="mt-4 text-[0.98rem] leading-relaxed text-cream/85">{slide.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${c.segments.goTo}: ${slide.title}`}
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
