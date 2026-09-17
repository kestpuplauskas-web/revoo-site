import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { getSlotOverrides } from "@/lib/homepage-media.functions";
import {
  DEFAULT_SLOTS,
  resolveSlots,
  type SlotKey,
  type SlotMedia,
} from "@/content/media-slots";

/**
 * Fetches active media overrides client-side after hydration.
 * Returns DEFAULT_SLOTS until the fetch completes, then swaps to resolved slots
 * only after all changed images have been preloaded (no flash, no CLS).
 * If the fetch fails, DEFAULT_SLOTS are kept — the page always works.
 */
export function useSlotOverrides(): Record<SlotKey, SlotMedia> {
  const [slots, setSlots] = useState<Record<SlotKey, SlotMedia>>(DEFAULT_SLOTS);
  const fetchOverrides = useServerFn(getSlotOverrides);

  useEffect(() => {
    let cancelled = false;

    fetchOverrides()
      .then(({ overrides }) => {
        if (cancelled || Object.keys(overrides).length === 0) return;

        const resolved = resolveSlots(overrides);

        // Preload changed images before swapping to avoid flash
        const imagePromises: Promise<void>[] = [];
        for (const key of Object.keys(resolved) as SlotKey[]) {
          const oldSlot = DEFAULT_SLOTS[key];
          const next = resolved[key];
          if (oldSlot.url === next.url) continue;

          // Skip video files — they're lazy-loaded by the carousel
          if (next.url.endsWith(".mp4") || next.url.endsWith(".webm")) continue;

          imagePromises.push(
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = next.url;
            }),
          );

          if (next.posterUrl && next.posterUrl !== oldSlot.posterUrl) {
            imagePromises.push(
              new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => resolve();
                img.src = next.posterUrl!;
              }),
            );
          }
        }

        Promise.all(imagePromises).then(() => {
          if (!cancelled) setSlots(resolved);
        });
      })
      .catch(() => {
        // Silent: defaults are already showing
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return slots;
}
