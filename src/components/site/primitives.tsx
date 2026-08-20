import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Renders text where exactly one *word* becomes the italic serif signature. */
export function Signature({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <em key={i} className="word-italic not-italic [font-style:italic]">
            {part}
          </em>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

/** Hero variant: the italic word sits above a 6px amber underline. */
export function SignatureUnderlined({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="relative inline-block">
            <span
              aria-hidden="true"
              className="absolute inset-x-[-0.06em] bottom-[0.22em] h-[6px] rounded-full bg-amber"
            />
            <em className="word-italic relative [font-style:italic]">{part}</em>
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section" | "article" | "header";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", className)}
      data-revealed={shown ? "true" : "false"}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

export function Eyebrow({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <p className={cn("eyebrow mb-4", tone === "dark" ? "text-amber" : "text-teal-500")}>{children}</p>
  );
}

type ButtonTone = "solid" | "cream" | "outline" | "outlineCream";

const toneClass: Record<ButtonTone, string> = {
  solid: "bg-teal-700 text-cream hover:bg-teal-900",
  cream: "bg-cream text-teal-900 hover:bg-cream-deep",
  outline: "border border-teal-700/30 text-teal-900 hover:border-teal-700 hover:bg-teal-100/50",
  outlineCream: "border border-cream/40 text-cream hover:border-cream hover:bg-cream/10",
};

export function CtaLink({
  href,
  children,
  tone = "solid",
  size = "md",
  className,
}: {
  href: string;
  children: ReactNode;
  tone?: ButtonTone;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 hover:-translate-y-0.5",
        size === "sm" ? "px-4 py-2 text-[0.9rem]" : "px-6 py-3 text-[0.95rem]",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </a>
  );
}

export function BrowserFrame({
  children,
  className,
  url = "app.revoo.site",
}: {
  children: ReactNode;
  className?: string;
  url?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_24px_60px_-40px_rgba(8,32,30,0.55)]",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-ink/10 bg-cream-deep/70 px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/20" />
        </span>
        <span className="truncate rounded-full bg-white px-3 py-1 text-[0.7rem] text-ink-soft">{url}</span>
      </div>
      <div className="bg-white">{children}</div>
    </div>
  );
}

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[36px] border-[10px] border-teal-900 bg-teal-900 shadow-[0_28px_70px_-40px_rgba(8,32,30,0.7)]",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[26px] bg-white">{children}</div>
    </div>
  );
}

export function MissingMedia({
  filename,
  label,
  ratio = "9 / 19",
  className,
}: {
  filename: string;
  label: string;
  ratio?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cream/30 bg-teal-800 px-6 text-center",
        className,
      )}
      style={{ aspectRatio: ratio }}
    >
      <span className="eyebrow text-amber">{label}</span>
      <span className="font-mono text-[0.8rem] text-cream/70">{filename}</span>
    </div>
  );
}
