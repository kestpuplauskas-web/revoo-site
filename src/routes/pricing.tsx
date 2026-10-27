import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitLead } from "@/lib/leads.functions";
import { TRIAL_REGISTRATION_URL } from "@/lib/trial";
import { earnFee, unitDisplayPrice, type Billing } from "@/lib/pricing-plans";
import { cn } from "@/lib/utils";
import { Header } from "@/components/site/Header";

const TITLE = "Pricing — Revoo PMS & booking system";
const DESC =
  "Three ways to pay for the same full Revoo platform: per unit, 2% of direct bookings, or custom. Two months free on every plan, no credit card.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://revoostay.com/pricing" }],
  }),
  component: PricingPage,
});

type Plan = "unit" | "earn" | "custom" | null;

const PLATFORM = [
  "Drag-and-drop booking calendar",
  "Housekeeping app for cleaning staff",
  "Automated, sequential invoicing",
  "Your own booking website",
  "Booking.com & Airbnb availability sync",
  "Guest emails in their own language",
  "Roles & team invitations",
  "Documented public REST API",
  "Two months free, no credit card",
];

const FAQ = [
  [
    "Do you take a commission on OTA bookings?",
    "Never. Booking.com, Airbnb and similar channels are yours — we don't touch that revenue on any plan. The 2% fee on Pay as you earn applies only to bookings made directly through your own Revoo website.",
  ],
  [
    "Why three plans instead of one fixed price?",
    "Because a brand-new property and an established one have different risks. One shouldn't pay a fixed bill before it has steady bookings, and one shouldn't pay per booking once volume is high. Features never differ between plans — only how the bill is worked out.",
  ],
  [
    "Can I switch plans later?",
    "Yes, anytime. If Pay as you earn starts costing more than Pay per unit would, we'll tell you — we'd rather you pay less.",
  ],
  [
    "What exactly is included at every price point?",
    "The full platform: booking calendar, housekeeping, automated invoicing, your own booking website, and the public API. Nothing is held back for a higher plan.",
  ],
  [
    "Is the 2-month free trial really free?",
    "Yes. No credit card up front, and no fee of any kind — flat or commission — for the first two months on any plan.",
  ],
];

const btn =
  "inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55";

function Check({ className }: { className?: string }) {
  return <span aria-hidden className={cn("shrink-0", className)}>✓</span>;
}

function Gift({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <div
      className={cn(
        "mb-5 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
        strong ? "bg-amber text-ink" : "bg-amber/15 text-amber-deep",
      )}
    >
      🎁 {children}
    </div>
  );
}

function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [units, setUnits] = useState(1);
  const [revenue, setRevenue] = useState(3000);
  const [plan, setPlan] = useState<Plan>(null);
  const [email, setEmail] = useState("");
  const [hotel, setHotel] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState(false);
  const send = useServerFn(submitLead);

  const price = unitDisplayPrice(units, billing);
  const perUnit = Math.round((price / units) * 10) / 10;
  const emailValid = z.string().email().safeParse(email.trim()).success;
  const canSend = emailValid && hotel.trim().length > 0 && status !== "busy";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setStatus("busy");
    try {
      await send({
        data: {
          name: hotel.trim(),
          email: email.trim(),
          property_name: hotel.trim(),
          notes: `[Pricing page — Custom plan]\n${message.trim()}`.slice(0, 4000),
          lang: "en",
          user_agent: navigator.userAgent.slice(0, 500),
          company_website: honeypot,
        },
      });
      setStatus("sent");
      setPlan("custom");
    } catch {
      setStatus("error");
    }
  };

  const ring = (p: Plan) => (plan === p ? "ring-2 ring-amber" : "");

  return (
    <div className="min-h-screen bg-cream font-sans text-ink">
      <Header lang="en" altHref="/lt" variant="solid" />
      <div className="h-20" aria-hidden="true" />

      <main>
        <section className="mx-auto max-w-[780px] px-6 pt-16 pb-10 text-center md:pt-20">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-amber-deep">Pricing</p>
          <h1 className="mb-5 font-display text-4xl font-semibold leading-tight md:text-[52px]">
            Pick how you pay. <em className="italic text-teal-700">Not what you get.</em>
          </h1>
          <p className="mb-8 text-[17px] leading-relaxed text-ink-soft">
            Every plan below runs the same full system — calendar, housekeeping, invoicing, your own booking website. No
            feature is ever locked behind a higher plan. You only choose how the bill is worked out.
          </p>
          <div role="group" aria-label="Billing period" className="inline-flex items-center gap-1 rounded-full bg-cream-deep p-1">
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={billing === b}
                onClick={() => setBilling(b)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber",
                  billing === b ? "bg-teal-900 text-cream" : "text-ink-soft",
                )}
              >
                {b === "monthly" ? "Monthly" : "Yearly"}
                {b === "yearly" && (
                  <span className="rounded-full bg-amber px-3 py-1 text-xs font-bold text-ink">pay 10, get 12</span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-6 max-w-[1180px] px-6">
          <div className="grid grid-cols-1 items-stretch gap-[18px] md:grid-cols-3">
            {/* Pay per unit */}
            <div className={cn("flex flex-col rounded-[20px] border border-ink/10 bg-card px-6 py-7 shadow-sm", ring("unit"))}>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-amber-deep">Pay per unit</p>
              <h2 className="mb-1.5 font-display text-2xl font-semibold">One flat number.</h2>
              <p className="mb-5 text-sm leading-normal text-ink-soft">
                For properties that want a predictable bill. Scales with your unit count, nothing else — and it never
                takes a cut of what your guests pay.
              </p>
              <div className="mb-1">
                <span className="text-[38px] font-semibold">€{price}</span>
                <span className="text-sm text-ink-soft">/month</span>
              </div>
              <p className="mb-3.5 text-xs text-ink-soft">
                €{perUnit} per unit · {billing === "yearly" ? "billed yearly, 2 months free" : "billed monthly"}
              </p>
              <Gift>First 2 months free — no bill at all</Gift>
              <div className="mb-5 rounded-2xl bg-cream px-4 py-3.5">
                <div className="mb-2 flex justify-between text-xs text-ink-soft">
                  <label htmlFor="units">Number of units</label>
                  <span className="font-semibold text-ink">{units}</span>
                </div>
                <input
                  id="units"
                  type="range"
                  min={1}
                  max={100}
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                  className="w-full accent-amber"
                />
              </div>
              <ul className="mb-5 flex flex-1 flex-col gap-2.5 text-sm leading-snug">
                {[
                  "Everything in Pay as you earn",
                  "0% commission, always — no matter your volume",
                  "One predictable line on your books",
                  "Price per unit drops automatically as you grow",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5"><Check className="text-teal-500" />{t}</li>
                ))}
              </ul>
              {plan === "unit" ? (
                <a href={TRIAL_REGISTRATION_URL} className={cn(btn, "bg-teal-900 text-cream")}>Selected ✓ — start free</a>
              ) : (
                <button type="button" onClick={() => setPlan("unit")} className={cn(btn, "bg-teal-900 text-cream")}>
                  Choose this plan
                </button>
              )}
            </div>

            {/* Pay as you earn */}
            <div className={cn("relative flex flex-col rounded-[20px] border border-cream/10 bg-teal-900 px-6 py-7 text-cream shadow-xl", ring("earn"))}>
              <div className="absolute -top-3.5 left-6 rounded-full bg-amber px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
                Recommended to start
              </div>
              <p className="mt-1 mb-2.5 text-xs font-semibold uppercase tracking-widest text-amber-light">Pay as you earn</p>
              <h2 className="mb-1.5 font-display text-2xl font-semibold text-cream">Nothing fixed, ever.</h2>
              <p className="mb-5 text-sm leading-normal text-teal-100">
                For properties just starting out, or unsure of volume. No monthly bill — you only pay when a guest books
                directly through the Revoo booking engine on your own website. No website yet? We build one on your
                domain.
              </p>
              <div className="mb-1.5">
                <span className="text-[38px] font-semibold text-cream">€0</span>
                <span className="text-sm text-teal-100">/month</span>
              </div>
              <p className="mb-3.5 text-sm font-semibold text-amber-light">+ 2% of direct bookings only</p>
              <Gift strong>First 2 months free — zero fee, zero bill</Gift>
              <div className="mb-5 rounded-2xl bg-cream/10 px-4 py-3.5">
                <label htmlFor="revenue" className="mb-2 block text-xs text-teal-100">
                  Try it: your direct bookings this month
                </label>
                <input
                  id="revenue"
                  type="range"
                  min={0}
                  max={20000}
                  step={100}
                  value={revenue}
                  onChange={(e) => setRevenue(Number(e.target.value))}
                  className="w-full accent-amber"
                />
                <div className="mt-2 flex items-baseline justify-between text-sm">
                  <span className="text-teal-100">€{revenue.toLocaleString("en-US")} booked</span>
                  <span className="font-bold text-cream">€{earnFee(revenue)} to Revoo</span>
                </div>
              </div>
              <ul className="mb-5 flex flex-1 flex-col gap-2.5 text-sm leading-snug">
                {[
                  "Full PMS — calendar, housekeeping, invoicing",
                  "Your own booking website, on your domain",
                  "No setup fee, no monthly bill",
                  "2 months free before any fee applies",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5"><Check className="text-amber-light" />{t}</li>
                ))}
              </ul>
              {plan === "earn" ? (
                <a href={TRIAL_REGISTRATION_URL} className={cn(btn, "bg-cream text-ink")}>Selected ✓ — start free</a>
              ) : (
                <button type="button" onClick={() => setPlan("earn")} className={cn(btn, "bg-cream text-ink")}>
                  Choose this plan
                </button>
              )}
            </div>

            {/* Custom */}
            <div className={cn("flex flex-col rounded-[20px] border border-ink/10 bg-card px-6 py-7 shadow-sm", ring("custom"))}>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-amber-deep">Custom</p>
              <h2 className="mb-1.5 font-display text-2xl font-semibold">Built around your operation.</h2>
              <p className="mb-5 text-sm leading-normal text-ink-soft">
                For hotels, resorts, spas, wake parks and multi-service venues — where accommodation is only part of the
                business, and pricing depends on what you actually need.
              </p>
              <p className="mb-1.5 text-[28px] font-semibold">No calls, ever</p>
              <p className="mb-3.5 text-sm text-ink-soft">Describe it in writing, we reply the same way</p>
              <Gift>First 2 months free — look around before anything is scoped</Gift>

              <div className="flex flex-1 flex-col gap-2.5">
                {status === "sent" ? (
                  <div role="status" className="flex flex-col gap-1.5 rounded-2xl bg-cream px-4 py-4">
                    <p className="text-sm font-bold text-teal-700">Thanks — message sent.</p>
                    <p className="text-sm leading-normal text-ink-soft">
                      We'll reply within one working day at {email.trim()}. Meanwhile, your free account is still one
                      click away.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submit} noValidate className="flex flex-col gap-2.5">
                    <p className="text-xs font-semibold text-teal-700">Prefer to describe your needs first?</p>
                    <div>
                      <Label htmlFor="c-email" className="mb-1 text-xs text-ink-soft">Email</Label>
                      <Input
                        id="c-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@yourproperty.com"
                        value={email}
                        maxLength={255}
                        aria-invalid={emailError}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setEmailError(email.trim().length > 0 && !emailValid)}
                        className={cn(emailError && "border-destructive")}
                      />
                      {emailError && (
                        <p className="mt-1 text-xs text-destructive">Enter a valid email, e.g. name@hotel.com.</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="c-hotel" className="mb-1 text-xs text-ink-soft">Property name</Label>
                      <Input
                        id="c-hotel"
                        autoComplete="organization"
                        placeholder="Your hotel or venue"
                        value={hotel}
                        maxLength={160}
                        onChange={(e) => setHotel(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="c-msg" className="mb-1 text-xs text-ink-soft">What should we know?</Label>
                      <Textarea
                        id="c-msg"
                        rows={3}
                        maxLength={3500}
                        placeholder="Property types, team size, what you sell beyond the room…"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden
                      className="hidden"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                    {status === "error" && (
                      <p role="alert" className="text-xs text-destructive">
                        Couldn't send. Please try again in a moment.
                      </p>
                    )}
                    <button type="submit" disabled={!canSend} className={cn(btn, "bg-cream-deep text-ink")}>
                      {status === "busy" ? "Sending…" : "Send"}
                    </button>
                    <p className="text-center text-xs text-ink-soft">We reply within 24 hours · No spam</p>
                  </form>
                )}
              </div>
              <a href={TRIAL_REGISTRATION_URL} className={cn(btn, "mt-4 bg-teal-900 text-cream")}>
                Create free account
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-[1000px] px-6">
          <div className="rounded-[20px] bg-cream-deep px-6 py-10 md:px-11">
            <div className="mb-7 text-center">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-amber-deep">Whichever you pick</p>
              <h2 className="font-display text-3xl font-semibold">Every plan runs the full platform.</h2>
            </div>
            <ul className="grid grid-cols-1 gap-x-7 gap-y-5 sm:grid-cols-2 md:grid-cols-3">
              {PLATFORM.map((t) => (
                <li key={t} className="flex gap-2.5 text-sm leading-normal"><Check className="text-teal-700" />{t}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-[1000px] px-6">
          <h2 className="mb-7 text-center font-display text-[28px] font-semibold">Not sure which one?</h2>
          <div className="flex flex-wrap gap-5">
            {[
              ["Just opened, unsure of volume?", <>Start on <strong>Pay as you earn</strong>. Zero risk while you find your footing.</>],
              ["Steady bookings, want one fixed bill?", <><strong>Pay per unit</strong> is usually cheaper once direct bookings are regular — we'll tell you when it's time to switch.</>],
              ["More than just rooms to manage?", <>Go <strong>Custom</strong> — or just register free and tell us what you need, in writing.</>],
            ].map(([h, b], i) => (
              <div key={i} className="flex-[1_1_280px] rounded-2xl border border-ink/10 bg-card px-6 py-6">
                <h3 className="mb-2 font-sans text-sm font-bold text-teal-700">{h}</h3>
                <p className="text-sm leading-normal text-ink-soft">{b}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-[760px] px-6">
          <h2 className="mb-6 text-center font-display text-[28px] font-semibold">Pricing questions, answered.</h2>
          <div className="flex flex-col">
            {FAQ.map(([q, a]) => (
              <details key={q} className="border-b border-ink/10 px-1 py-4">
                <summary className="min-h-11 cursor-pointer py-2 text-[15px] font-semibold">{q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-18 bg-teal-900 px-6 py-16 text-center">
          <h2 className="mb-3.5 font-display text-3xl font-semibold text-cream">Two months free, on every plan.</h2>
          <p className="mb-7 text-[15px] text-teal-100">
            No credit card. No sales call to unlock access. Create your account and see your own numbers.
          </p>
          <a
            href={TRIAL_REGISTRATION_URL}
            className="inline-flex min-h-11 items-center rounded-full bg-cream px-8 py-4 text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          >
            Start free →
          </a>
        </section>
      </main>

      <footer className="px-6 py-7 text-center text-xs text-ink-soft">
        Revoo · revoostay.com · hello@revoostay.com
      </footer>
    </div>
  );
}
