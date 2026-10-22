import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { TRIAL_REGISTRATION_URL } from "@/lib/trial";

const ENDPOINT = "/api/track-view";

/**
 * Fire-and-forget lankomumo signalas. Be slapukų, be saugyklos.
 * Administravimo maršrutai nesekami, klaidos tylios.
 */
export function usePageTracking() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastSent = useRef<string | null>(null);

  // „Free trial“ mygtukų paspaudimai: bet kuri nuoroda į registraciją.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || !a.href.startsWith(TRIAL_REGISTRATION_URL)) return;
      const payload = JSON.stringify({ event: "trial_click", path: window.location.pathname });
      try {
        if (navigator.sendBeacon?.(ENDPOINT, new Blob([payload], { type: "text/plain;charset=UTF-8" }))) return;
      } catch {
        /* krentam į fetch */
      }
      void fetch(ENDPOINT, { method: "POST", body: payload, keepalive: true }).catch(() => {});
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/prisijungimas")) return;
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    const payload = JSON.stringify({
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer : "",
    });

    try {
      const blob = new Blob([payload], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon?.(ENDPOINT, blob)) return;
    } catch {
      /* krentam į fetch */
    }

    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* analitika niekada nelaužo puslapio */
    });
  }, [pathname]);
}
