import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { href, t, type Lang } from "@/lib/i18n";

export function MobileCtaBar({ lang }: { lang: Lang }) {
  const c = t(lang);
  const [visible, setVisible] = useState(false);
  // Component memory only — no browser storage anywhere on this site.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const onScroll = () => {
      const scrollable = document.body.scrollHeight - window.innerHeight;
      setVisible(scrollable > 0 && window.scrollY / scrollable > 0.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  if (dismissed || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cream/15 bg-teal-900/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <div className="flex items-center gap-3">
        <a
          href={`${href(lang)}#demo`}
          className="flex-1 rounded-full bg-cream px-5 py-2.5 text-center text-[0.9rem] font-medium text-teal-900"
        >
          {c.mobileCta.text}
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={c.mobileCta.dismiss}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/25 text-cream"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
