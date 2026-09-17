import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { getCopyOverrides } from "@/lib/homepage-copy.functions";
import { applyCopyOverrides } from "@/content/copy-paths";
import type { Copy } from "@/content/copy.types";
import { t, type Lang } from "@/lib/i18n";

/**
 * Grąžina puslapio tekstus su administratoriaus perrašymais.
 * Iki užklausos pabaigos (ir jai nepavykus) rodomi numatytieji tekstai,
 * todėl puslapis visada veikia.
 */
export function useCopyOverrides(lang: Lang): Copy {
  const base = t(lang);
  const [copy, setCopy] = useState<Copy>(base);
  const fetchOverrides = useServerFn(getCopyOverrides);

  useEffect(() => {
    let cancelled = false;
    setCopy(base);

    fetchOverrides({ data: { lang } })
      .then(({ overrides }) => {
        if (cancelled || Object.keys(overrides).length === 0) return;
        setCopy(applyCopyOverrides(base, overrides));
      })
      .catch(() => {
        // tylu: numatytieji tekstai jau rodomi
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return copy;
}
