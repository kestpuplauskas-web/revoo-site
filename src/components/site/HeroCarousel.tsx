import { useEffect, useRef, useState } from "react";

import { BrowserFrame, MissingMedia, PhoneFrame } from "./primitives";
import { media } from "@/content/media";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const DURATION = 6000;

type Slide = {
  kind: "video" | "image" | "missing";
  frame: "browser" | "phone" | "card";
  src?: string;
  width?: number;
  height?: number;
  filename?: string;
  altKey: "calendar" | "housekeepingApp" | "invoice" | "housekeepingWeek";
};

export function HeroCarousel({ lang }: { lang: Lang }) {
  const c = t(lang);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  const slides: Slide[] = [
    {
      kind: "video",
      frame: "browser",
      src: media.bookingCalendar.url,
      width: media.bookingCalendar.width,
      height: media.bookingCalendar.height,
      altKey: "calendar",
    },
    {
      kind: "image",
      frame: "phone",
      src: media.housekeepingApp.url,
      width: media.housekeepingApp.width,
      height: media.housekeepingApp.height,
      altKey: "housekeepingApp",
    },
    {
      kind: "image",
      frame: "card",
      src: media.invoice.url,
      width: media.invoice.width,
      height: media.invoice.height,
      altKey: "invoice",
    },
    { kind: "missing", frame: "phone", filename: "admin-app.mp4", altKey: "housekeepingApp" },
    {
      kind: "image",
      frame: "browser",
      src: media.housekeepingWeek.url,
      width: media.housekeepingWeek.width,
      height: media.housekeepingWeek.height,
      altKey: "housekeepingWeek",
    },
  ];

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Pause when the carousel is off-screen.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const node = sceneRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => setVisible(entries[0]?.isIntersecting ?? true), {
      threshold: 0.25,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const running = !paused && visible && !reduced;

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % slides.length), DURATION);
    return () => window.clearTimeout(id);
  }, [running, index, slides.length]);

  // Only the visible video decodes.
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === index && !reduced) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [index, reduced]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setIndex((i) => (i + 1) % slides.length);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setIndex((i) => (i - 1 + slides.length) % slides.length);
    }
  };

  return (
    <div
      ref={sceneRef}
      className="flex h-full w-full flex-col justify-center gap-8 px-6 py-14 sm:px-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label={c.carousel.label}
    >
      <div className="relative mx-auto flex h-[420px] w-full max-w-[520px] items-center justify-center sm:h-[460px]">
        {slides.map((slide, i) => {
          const active = i === index;
          const alt = c.media.alt[slide.altKey];
          return (
            <div
              key={i}
              aria-hidden={!active}
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-all duration-[600ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]",
                active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
              )}
              style={reduced ? undefined : { transform: active ? "scale(1)" : "scale(0.97)" }}
            >
              {slide.frame === "browser" && slide.src && (
                <BrowserFrame className="w-full" url={c.media.browserUrl}>
                  {slide.kind === "video" ? (
                    <video
                      ref={(el) => {
                        videoRefs.current[i] = el;
                      }}
                      className="block h-auto w-full"
                      width={slide.width}
                      height={slide.height}
                      src={slide.src}
                      muted
                      loop
                      playsInline
                      autoPlay={i === 0}
                      preload={i === 0 ? "auto" : "metadata"}
                      aria-label={alt}
                    />
                  ) : (
                    <img
                      src={slide.src}
                      width={slide.width}
                      height={slide.height}
                      alt={alt}
                      loading={i === 0 ? "eager" : "lazy"}
                      className="block h-auto w-full"
                    />
                  )}
                </BrowserFrame>
              )}

              {slide.frame === "phone" && slide.src && (
                <PhoneFrame className="h-full w-auto max-w-[240px]">
                  <img
                    src={slide.src}
                    width={slide.width}
                    height={slide.height}
                    alt={alt}
                    loading="lazy"
                    className="block h-full w-full object-contain"
                  />
                </PhoneFrame>
              )}

              {slide.frame === "card" && slide.src && (
                <div className="max-h-full overflow-hidden rounded-2xl bg-white p-3 shadow-[0_24px_60px_-40px_rgba(8,32,30,0.6)]">
                  <img
                    src={slide.src}
                    width={slide.width}
                    height={slide.height}
                    alt={alt}
                    loading="lazy"
                    className="block max-h-[380px] w-auto object-contain"
                  />
                </div>
              )}

              {slide.kind === "missing" && (
                <MissingMedia
                  filename={slide.filename ?? ""}
                  label={c.media.missing}
                  className="h-full w-[220px]"
                />
              )}
            </div>
          );
        })}
      </div>

      <p aria-live="polite" className="min-h-[3rem] text-center font-display text-2xl text-cream">
        {c.carousel.slides[index]}
      </p>

      <div className="mx-auto flex w-full max-w-[420px] gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${c.carousel.goTo} ${i + 1}: ${c.carousel.slides[i]}`}
            aria-current={i === index}
            className="group h-3 flex-1 py-1"
          >
            <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-cream/25">
              {i === index && (
                <span
                  key={`${i}-${index}-${running}`}
                  className="absolute inset-y-0 left-0 block bg-amber"
                  style={
                    running
                      ? { animation: `revoo-progress ${DURATION}ms linear forwards` }
                      : { width: "100%" }
                  }
                />
              )}
            </span>
          </button>
        ))}
      </div>

      <style>{`@keyframes revoo-progress { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );
}
