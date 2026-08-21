import { useEffect, useRef } from "react";

import { media } from "@/content/media";
import { t, type Lang } from "@/lib/i18n";

import "./HeroCarousel.css";

type Vars = Record<string, string | number>;

const v = (o: Vars) => o as React.CSSProperties;

function Vid({ src, poster }: { src: string; poster?: string }) {
  return (
    <video
      src={src}
      {...(poster ? { poster } : {})}
      muted
      loop
      playsInline
      preload="metadata"
      // eslint-disable-next-line jsx-a11y/media-has-caption
    />
  );
}

function Browser({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="rc-browser">
      <div className="rc-bbar">
        <i />
        <i />
        <i />
        <span>{url}</span>
      </div>
      {children}
    </div>
  );
}

export function HeroCarousel({ lang }: { lang: Lang }) {
  const c = t(lang);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const SCENE_MS = 7500,
      ROT_MS = 2500;
    const stage = stageRef.current;
    if (!stage) return;
    const scenes = ([] as HTMLElement[]).slice.call(stage.querySelectorAll(".rc-scene"));
    const caps = ([] as HTMLElement[]).slice.call(stage.querySelectorAll(".rc-cap p"));
    const bars = ([] as HTMLButtonElement[]).slice.call(stage.querySelectorAll(".rc-prog button"));
    const glow = stage.querySelector<HTMLElement>(".rc-glow");
    const glow2 = stage.querySelector<HTMLElement>(".rc-glow2");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0,
      paused = false,
      visible = true,
      tId: number | undefined,
      rId: number | undefined,
      sId: number | undefined;

    bars.forEach(function (b) {
      b.style.setProperty("--t", SCENE_MS + "ms");
    });
    function vids(sc: HTMLElement) {
      return ([] as HTMLVideoElement[]).slice.call(sc.querySelectorAll("video"));
    }

    function show(n: number) {
      i = (n + scenes.length) % scenes.length;
      scenes.forEach(function (sc, k) {
        const on = k === i;
        sc.classList.toggle("on", on);
        vids(sc).forEach(function (vid) {
          if (on && !reduce) {
            void vid.play().catch(function () {});
          } else {
            vid.pause();
            try {
              vid.currentTime = 0;
            } catch (e) {
              /* noop */
            }
          }
        });
      });
      caps.forEach(function (p, k) {
        p.classList.toggle("on", k === i);
      });
      bars.forEach(function (b, k) {
        b.classList.remove("on");
        if (k === i) b.setAttribute("aria-current", "true");
        else b.removeAttribute("aria-current");
        if (k === i) {
          void b.offsetWidth;
          b.classList.add("on");
        }
      });
      if (glow) glow.className = "rc-glow g" + (i + 1);
      if (glow2) glow2.className = "rc-glow2 g" + (i + 1);
      window.clearInterval(rId);
      if (i === 3 && !reduce) rId = window.setInterval(rotate, ROT_MS);
      window.clearInterval(sId);
      if (i === 2 && !reduce) sId = window.setInterval(swap, 3000);
    }

    function swap() {
      ([] as HTMLElement[]).slice.call(stage!.querySelectorAll(".rc-sw")).forEach(function (el) {
        const front = el.classList.contains("sw-front");
        el.classList.toggle("sw-front", !front);
        el.classList.toggle("sw-back", front);
      });
    }

    const ORDER = ["pos-c", "pos-l", "pos-r"];
    let off = 0;
    function rotate() {
      off = (off + 1) % 3;
      ([] as HTMLElement[]).slice
        .call(scenes[3]!.querySelectorAll(".rc-slot"))
        .forEach(function (el, k) {
          el.classList.remove("pos-c", "pos-l", "pos-r");
          el.classList.add(ORDER[(k + off) % 3]!);
        });
    }

    function schedule() {
      window.clearTimeout(tId);
      if (!reduce) tId = window.setTimeout(tick, SCENE_MS);
    }
    function tick() {
      if (!paused && visible) show(i + 1);
      schedule();
    }

    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      stage.style.setProperty("--mx", (nx * -22).toFixed(2));
      stage.style.setProperty("--my", (ny * -16).toFixed(2));
      stage.style.setProperty("--px", (e.clientX - r.left).toFixed(0) + "px");
      stage.style.setProperty("--py", (e.clientY - r.top).toFixed(0) + "px");
    };
    const onLeavePointer = () => {
      stage.style.setProperty("--mx", "0");
      stage.style.setProperty("--my", "0");
    };
    if (!reduce) {
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerleave", onLeavePointer);
    }

    const onEnter = () => {
      paused = true;
      window.clearTimeout(tId);
      window.clearInterval(rId);
      window.clearInterval(sId);
      bars.forEach(function (b) {
        const bar = b.querySelector("i");
        if (bar) (bar as HTMLElement).style.animationPlayState = "paused";
      });
    };
    const onLeave = () => {
      paused = false;
      bars.forEach(function (b) {
        const bar = b.querySelector("i");
        if (bar) (bar as HTMLElement).style.animationPlayState = "running";
      });
      if (i === 3 && !reduce) rId = window.setInterval(rotate, ROT_MS);
      if (i === 2 && !reduce) sId = window.setInterval(swap, 3000);
      schedule();
    };
    stage.addEventListener("mouseenter", onEnter);
    stage.addEventListener("mouseleave", onLeave);

    const clickHandlers = bars.map((b, k) => {
      const h = () => {
        show(k);
        schedule();
      };
      b.addEventListener("click", h);
      return h;
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        show(i + 1);
        schedule();
      } else if (e.key === "ArrowLeft") {
        show(i - 1);
        schedule();
      }
    };
    stage.setAttribute("tabindex", "0");
    stage.addEventListener("keydown", onKey);

    let sx = 0;
    const onDown = (e: PointerEvent) => {
      sx = e.clientX;
    };
    const onUp = (e: PointerEvent) => {
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 60) {
        show(i + (dx < 0 ? 1 : -1));
        schedule();
      }
    };
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointerup", onUp);

    const onVis = () => {
      visible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);

    let io: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        function (es) {
          es.forEach(function (e) {
            visible = e.isIntersecting;
            if (!visible) window.clearTimeout(tId);
            else schedule();
          });
        },
        { threshold: 0.15 },
      );
      io.observe(stage);
    }
    show(0);
    schedule();

    return () => {
      window.clearTimeout(tId);
      window.clearInterval(rId);
      window.clearInterval(sId);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeavePointer);
      stage.removeEventListener("mouseenter", onEnter);
      stage.removeEventListener("mouseleave", onLeave);
      stage.removeEventListener("keydown", onKey);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointerup", onUp);
      bars.forEach((b, k) => b.removeEventListener("click", clickHandlers[k]!));
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
    };
  }, []);

  return (
    <div
      className="rc-stage"
      ref={stageRef}
      role="group"
      aria-roledescription="carousel"
      aria-label={c.carousel.label}
    >
      <div className="rc-glow g1" />
      <div className="rc-glow2 g1" />
      <div className="rc-grid" />
      <div className="rc-spot" />
      <div className="rc-vig" />

      {/* Scene 1 — bookings */}
      <div className="rc-scene" data-s="0">
        <div
          className="rc-card d1 lead"
          style={v({ "--x": "8%", "--y": "16%", "--w": "87%", "--ex": -30, "--ey": 18, "--i": 0 })}
        >
          <div className="rc-par" style={v({ "--p": 1.6 })}>
            <div className="rc-float" style={v({ "--dur": "9s", "--del": "0s" })}>
              <Browser url="app.revoo.site / bookings">
                <Vid src="/media/10_new_booking.mp4" poster="/media/6_booking.png" />
              </Browser>
            </div>
          </div>
        </div>
        <div
          className="rc-card d2"
          style={v({ "--x": "48%", "--y": "56%", "--w": "50%", "--ex": 30, "--ey": 24, "--i": 1 })}
        >
          <div className="rc-par" style={v({ "--p": 1.1 })}>
            <div className="rc-float" style={v({ "--dur": "11s", "--del": "-2s" })}>
              <Browser url="app.revoo.site / housekeeping">
                <img src="/media/8_housekeeping.png" alt="" loading="lazy" />
              </Browser>
            </div>
          </div>
        </div>
        <div
          className="rc-card d2"
          style={v({ "--x": "2%", "--y": "60%", "--w": "24%", "--ex": -24, "--ey": 20, "--i": 2 })}
        >
          <div className="rc-par" style={v({ "--p": 1.1 })}>
            <div className="rc-float" style={v({ "--dur": "13s", "--del": "-4s" })}>
              <div className="rc-phone">
                <Vid src="/media/7_housekeeping_app.mp4" poster={media.housekeepingApp.url} />
              </div>
            </div>
          </div>
        </div>
        <div
          className="rc-card d3"
          style={v({ "--x": "62%", "--y": "8%", "--w": "30%", "--ex": 26, "--ey": -18, "--i": 3 })}
        >
          <div className="rc-par" style={v({ "--p": 0.5 })}>
            <div className="rc-float" style={v({ "--dur": "12s", "--del": "-6s" })}>
              <div className="rc-plain">
                <img src="/media/9_invoice.webp" alt="" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scene 2 — housekeeping */}
      <div className="rc-scene" data-s="1">
        <div
          className="rc-card d1 lead"
          style={v({ "--x": "36%", "--y": "20%", "--w": "27%", "--ex": -26, "--ey": 26, "--i": 0 })}
        >
          <div className="rc-par" style={v({ "--p": 1.6 })}>
            <div className="rc-float" style={v({ "--dur": "10s", "--del": "0s" })}>
              <div className="rc-phone">
                <Vid src="/media/7_housekeeping_app.mp4" poster={media.housekeepingApp.url} />
              </div>
            </div>
          </div>
        </div>
        <div
          className="rc-card d2"
          style={v({ "--x": "38%", "--y": "20%", "--w": "58%", "--ex": 34, "--ey": -16, "--i": 1 })}
        >
          <div className="rc-par" style={v({ "--p": 1.1 })}>
            <div className="rc-float" style={v({ "--dur": "12s", "--del": "-3s" })}>
              <Browser url="app.revoo.site / housekeeping">
                <img src="/media/8_housekeeping.png" alt="" loading="lazy" />
              </Browser>
            </div>
          </div>
        </div>
        <div
          className="rc-card d3"
          style={v({ "--x": "44%", "--y": "66%", "--w": "44%", "--ex": 22, "--ey": 26, "--i": 2 })}
        >
          <div className="rc-par" style={v({ "--p": 0.5 })}>
            <div className="rc-float" style={v({ "--dur": "14s", "--del": "-5s" })}>
              <Browser url="app.revoo.site / bookings">
                <img src="/media/6_booking.png" alt="" loading="lazy" />
              </Browser>
            </div>
          </div>
        </div>
        <div
          className="rc-card d2"
          style={v({ "--x": "0%", "--y": "62%", "--w": "26%", "--ex": -28, "--ey": 18, "--i": 3 })}
        >
          <div className="rc-par" style={v({ "--p": 1.1 })}>
            <div className="rc-float" style={v({ "--dur": "11s", "--del": "-7s" })}>
              <div className="rc-plain">
                <img src="/media/4_notification_for_client.png" alt="" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scene 3 — invoices */}
      <div className="rc-scene" data-s="2">
        <div
          className="rc-card rc-sw sw-front lead"
          style={v({ "--x": "26%", "--y": "18%", "--w": "46%", "--ex": -24, "--ey": 24, "--i": 0 })}
        >
          <div className="rc-par" style={v({ "--p": 1.6 })}>
            <div className="rc-float" style={v({ "--dur": "10s", "--del": "0s" })}>
              <div className="rc-plain">
                <img src="/media/9_invoice.webp" alt="" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
        <div
          className="rc-card d2"
          style={v({ "--x": "50%", "--y": "12%", "--w": "48%", "--ex": 32, "--ey": -20, "--i": 1 })}
        >
          <div className="rc-par" style={v({ "--p": 1.1 })}>
            <div className="rc-float" style={v({ "--dur": "12s", "--del": "-3s" })}>
              <div className="rc-plain">
                <img src="/media/4_notification_for_client.png" alt="" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
        <div
          className="rc-card d3"
          style={v({ "--x": "40%", "--y": "64%", "--w": "52%", "--ex": 26, "--ey": 24, "--i": 2 })}
        >
          <div className="rc-par" style={v({ "--p": 0.5 })}>
            <div className="rc-float" style={v({ "--dur": "13s", "--del": "-5s" })}>
              <Browser url="app.revoo.site / bookings">
                <img src="/media/6_booking.png" alt="" loading="lazy" />
              </Browser>
            </div>
          </div>
        </div>
        <div
          className="rc-card rc-sw sw-back"
          style={v({ "--x": "2%", "--y": "66%", "--w": "22%", "--ex": -26, "--ey": 20, "--i": 3 })}
        >
          <div className="rc-par" style={v({ "--p": 1.1 })}>
            <div className="rc-float" style={v({ "--dur": "11s", "--del": "-6s" })}>
              <div className="rc-phone">
                <Vid src="/media/5_admin_app.mp4" poster="/media/5_admin_app.webp" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scene 4 — your website */}
      <div className="rc-scene" data-s="3">
        <div
          className="rc-card rc-slot pos-c"
          style={v({ "--x": "50%", "--y": "20%", "--w": "42%", "--ex": 0, "--ey": 20, "--i": 0 })}
        >
          <div className="rc-par" style={v({ "--p": 1.5 })}>
            <div className="rc-float" style={v({ "--dur": "10s", "--del": "0s" })}>
              <Browser url="yourhotel.com">
                <img src="/media/1_homepage_calendar.png" alt="" loading="lazy" />
              </Browser>
            </div>
          </div>
        </div>
        <div
          className="rc-card rc-slot pos-l"
          style={v({ "--x": "-4%", "--y": "20%", "--w": "42%", "--ex": -28, "--ey": 20, "--i": 1 })}
        >
          <div className="rc-par" style={v({ "--p": 1.5 })}>
            <div className="rc-float" style={v({ "--dur": "12s", "--del": "-3s" })}>
              <Browser url="yourhotel.com">
                <img src="/media/2_homepage_1.png" alt="" loading="lazy" />
              </Browser>
            </div>
          </div>
        </div>
        <div
          className="rc-card rc-slot pos-r"
          style={v({ "--x": "68%", "--y": "20%", "--w": "42%", "--ex": 28, "--ey": 20, "--i": 2 })}
        >
          <div className="rc-par" style={v({ "--p": 1.5 })}>
            <div className="rc-float" style={v({ "--dur": "13s", "--del": "-5s" })}>
              <Browser url="yourhotel.com">
                <img src="/media/3_homepage_2.png" alt="" loading="lazy" />
              </Browser>
            </div>
          </div>
        </div>
        <div
          className="rc-card d3"
          style={v({ "--x": "26%", "--y": "70%", "--w": "46%", "--ex": 0, "--ey": 26, "--i": 3 })}
        >
          <div className="rc-par" style={v({ "--p": 0.5 })}>
            <div className="rc-float" style={v({ "--dur": "14s", "--del": "-7s" })}>
              <Browser url="app.revoo.site / bookings">
                <img src="/media/6_booking.png" alt="" loading="lazy" />
              </Browser>
            </div>
          </div>
        </div>
      </div>

      <div className="rc-cap">
        {c.carousel.slides.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      <div className="rc-prog">
        {c.carousel.slides.map((_, i) => (
          <button key={i} type="button" aria-label={`${c.carousel.goTo} ${i + 1}`}>
            <i />
          </button>
        ))}
      </div>
    </div>
  );
}
