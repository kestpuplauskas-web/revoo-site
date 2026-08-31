import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Faq({ lang }: { lang: Lang }) {
  const c = t(lang);
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-[820px] divide-y divide-ink/10 border-y border-ink/10">
      {c.faq.items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                className="flex w-full items-center justify-between gap-6 py-5 text-left font-display text-xl text-ink transition-colors hover:text-teal-500"
              >
                {item.q}
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "h-5 w-5 shrink-0 text-teal-500 transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
            </h3>
            <div id={`faq-panel-${i}`} hidden={!isOpen} className="pb-6 space-y-3">
              {item.a.split("\n\n").map((para, pi) => (
                <p key={pi} className="measure text-[0.98rem] leading-relaxed text-ink-soft">
                  {para}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
