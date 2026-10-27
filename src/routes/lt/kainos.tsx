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
import { useMinPrice } from "@/hooks/useMinPrice";
import { Header } from "@/components/site/Header";

const TITLE = "Kainos — Revoo apgyvendinimo valdymo ir rezervacijų sistema";
const DESC =
  "Trys būdai mokėti už tą pačią pilną Revoo sistemą: pagal vienetus, 2 % nuo tiesioginių rezervacijų arba individualiai. 2 mėnesiai nemokamai, be kortelės.";

export const Route = createFileRoute("/lt/kainos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://revoostay.com/lt/kainos" }],
  }),
  component: KainosPage,
});

type Plan = "unit" | "earn" | "custom" | null;

const PLATFORM = [
  "Rezervacijų kalendorius su tempimu",
  "Kambarių tvarkymo programėlė kambarinėms",
  "Automatinės, eilės tvarka numeruojamos sąskaitos",
  "Jūsų rezervacijų svetainė",
  "Booking.com ir Airbnb užimtumo sinchronizavimas",
  "Laiškai svečiams jų kalba",
  "Rolės ir komandos kvietimai",
  "Dokumentuota vieša REST API",
  "2 mėnesiai nemokamai, be kortelės",
];

const FAQ = [
  [
    "Ar imate komisinį nuo Booking.com ar Airbnb rezervacijų?",
    "Niekada. Booking.com, Airbnb ir kiti kanalai – jūsų, šių pajamų neliečiame jokiame plane. 2 % mokestis plane „Mokate, kai uždirbate“ taikomas tik tiesioginėms rezervacijoms per Revoo rezervacijų sistemą jūsų svetainėje ar domene.",
  ],
  [
    "Kodėl trys planai, o ne viena fiksuota kaina?",
    "Nes naujo ir jau veikiančio objekto rizika skiriasi. Naujam nereikėtų mokėti fiksuotos sumos, kol nėra pastovių rezervacijų, o didelės apimties objektui – mokėti už kiekvieną rezervaciją. Funkcijos planuose nesiskiria – skiriasi tik tai, kaip skaičiuojama sąskaita.",
  ],
  [
    "Ar galiu vėliau pakeisti planą?",
    "Taip, bet kada. Jei „Mokate, kai uždirbate“ pradės kainuoti daugiau nei „Mokate pagal vienetus“, mes jums pranešime – norime, kad mokėtumėte mažiau.",
  ],
  [
    "Kas tiksliai įeina į kiekvieną planą?",
    "Visa sistema: rezervacijų kalendorius, kambarių tvarkymas, automatinės sąskaitos, jūsų rezervacijų svetainė ir vieša API. Niekas nepaliekama brangesniam planui.",
  ],
  [
    "Ar 2 mėnesių bandymas tikrai nemokamas?",
    "Taip. Nereikia kortelės ir pirmus du mėnesius jokiame plane netaikomas joks mokestis – nei fiksuotas, nei komisinis.",
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

function KainosPage() {
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

  const minPrice = useMinPrice();
  const price = unitDisplayPrice(units, billing, minPrice);
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
          notes: `[Kainų puslapis — Individualus planas]\n${message.trim()}`.slice(0, 4000),
          lang: "lt",
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
      <Header lang="lt" altHref="/pricing/" variant="solid" />
      <div className="h-20" aria-hidden="true" />

      <main>
        <section className="mx-auto max-w-[780px] px-6 pt-16 pb-10 text-center md:pt-20">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-amber-deep">Kainos</p>
          <h1 className="mb-5 font-display text-4xl font-semibold leading-tight md:text-[52px]">
            Rinkitės, kaip mokėti. <em className="italic text-teal-700">Ne tai, ką gaunate.</em>
          </h1>
          <p className="mb-8 text-[17px] leading-relaxed text-ink-soft">
            Visi planai suteikia tą pačią pilną sistemą – kalendorių, kambarių tvarkymą, sąskaitas, jūsų rezervacijų svetainę.
            Jokia funkcija neužrakinta brangesniam planui. Jūs renkatės tik tai, kaip skaičiuojama sąskaita.
          </p>
          <div role="group" aria-label="Atsiskaitymo laikotarpis" className="inline-flex items-center gap-1 rounded-full bg-cream-deep p-1">
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
                {b === "monthly" ? "Kas mėnesį" : "Kas metus"}
                {b === "yearly" && (
                  <span className="rounded-full bg-amber px-3 py-1 text-xs font-bold text-ink">mokate už 10, gaunate 12</span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-6 max-w-[1180px] px-6">
          <div className="grid grid-cols-1 items-stretch gap-[18px] md:grid-cols-3">
            {/* Pay per unit */}
            <div className={cn("flex flex-col rounded-[20px] border border-ink/10 bg-card px-6 py-7 shadow-sm", ring("unit"))}>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-amber-deep">Mokate pagal vienetus</p>
              <h2 className="mb-1.5 font-display text-2xl font-semibold">Viena aiški suma.</h2>
              <p className="mb-5 text-sm leading-normal text-ink-soft">
                Objektams, kurie nori nuspėjamos sąskaitos. Kaina priklauso tik nuo vienetų skaičiaus – ir niekada
                neimame dalies to, ką sumoka jūsų svečiai.
              </p>
              <div className="mb-1">
                <span className="text-[38px] font-semibold">{price} €</span>
                <span className="text-sm text-ink-soft">/mėn.</span>
              </div>
              <p className="mb-3.5 text-xs text-ink-soft">
                {perUnit} € už vienetą · {billing === "yearly" ? "mokama kas metus, 2 mėn. nemokamai" : "mokama kas mėnesį"}
              </p>
              <Gift>Pirmi 2 mėnesiai nemokamai – jokios sąskaitos</Gift>
              <div className="mb-5 rounded-2xl bg-cream px-4 py-3.5">
                <div className="mb-2 flex justify-between text-xs text-ink-soft">
                  <label htmlFor="units">Vienetų skaičius</label>
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
                  "Viskas, kas yra „Mokate, kai uždirbate“",
                  "0 % komisinių visada – nepriklausomai nuo apimties",
                  "Viena nuspėjama eilutė jūsų apskaitoje",
                  "Vieneto kaina automatiškai mažėja augant",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5"><Check className="text-teal-500" />{t}</li>
                ))}
              </ul>
              {plan === "unit" ? (
                <a href={TRIAL_REGISTRATION_URL} className={cn(btn, "bg-teal-900 text-cream")}>Pasirinkta ✓ – pradėti nemokamai</a>
              ) : (
                <button type="button" onClick={() => setPlan("unit")} className={cn(btn, "bg-teal-900 text-cream")}>
                  Rinktis šį planą
                </button>
              )}
            </div>

            {/* Pay as you earn */}
            <div className={cn("relative flex flex-col rounded-[20px] border border-cream/10 bg-teal-900 px-6 py-7 text-cream shadow-xl", ring("earn"))}>
              <div className="absolute -top-3.5 left-6 rounded-full bg-amber px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
                Rekomenduojama pradžiai
              </div>
              <p className="mt-1 mb-2.5 text-xs font-semibold uppercase tracking-widest text-amber-light">Mokate, kai uždirbate</p>
              <h2 className="mb-1.5 font-display text-2xl font-semibold text-cream">Jokių fiksuotų mokesčių.</h2>
              <p className="mb-5 text-sm leading-normal text-teal-100">
                Naujiems objektams arba tiems, kurie dar nežino apimties. Jokios mėnesinės sąskaitos – mokate tik tada, kai
                svečias rezervuoja tiesiogiai per Revoo rezervacijų sistemą jūsų svetainėje. Neturite svetainės? Sukursime ją
                jūsų domene.
              </p>
              <div className="mb-1.5">
                <span className="text-[38px] font-semibold text-cream">0 €</span>
                <span className="text-sm text-teal-100">/mėn.</span>
              </div>
              <p className="mb-3.5 text-sm font-semibold text-amber-light">+ 2 % tik nuo tiesioginių rezervacijų · 0 % nuo Booking.com ir Airbnb</p>
              <Gift strong>Pirmi 2 mėnesiai nemokamai – jokio mokesčio</Gift>
              <div className="mb-5 rounded-2xl bg-cream/10 px-4 py-3.5">
                <label htmlFor="revenue" className="mb-2 block text-xs text-teal-100">
                  Išbandykite: jūsų tiesioginės rezervacijos per mėnesį
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
                  <span className="text-teal-100">{revenue.toLocaleString("lt-LT")} € rezervacijų</span>
                  <span className="font-bold text-cream">{earnFee(revenue)} € Revoo</span>
                </div>
              </div>
              <ul className="mb-5 flex flex-1 flex-col gap-2.5 text-sm leading-snug">
                {[
                  "Pilna valdymo sistema – kalendorius, tvarkymas, sąskaitos",
                  "Rezervacijų sistema jūsų svetainėje – arba nauja svetainė jūsų domene",
                  "Jokio diegimo mokesčio, jokios mėnesinės sąskaitos",
                  "2 mėnesiai nemokamai prieš bet kokį mokestį",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5"><Check className="text-amber-light" />{t}</li>
                ))}
              </ul>
              {plan === "earn" ? (
                <a href={TRIAL_REGISTRATION_URL} className={cn(btn, "bg-cream text-ink")}>Pasirinkta ✓ – pradėti nemokamai</a>
              ) : (
                <button type="button" onClick={() => setPlan("earn")} className={cn(btn, "bg-cream text-ink")}>
                  Rinktis šį planą
                </button>
              )}
            </div>

            {/* Custom */}
            <div className={cn("flex flex-col rounded-[20px] border border-ink/10 bg-card px-6 py-7 shadow-sm", ring("custom"))}>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-amber-deep">Individualus</p>
              <h2 className="mb-1.5 font-display text-2xl font-semibold">Sukurtas pagal jūsų veiklą.</h2>
              <p className="mb-5 text-sm leading-normal text-ink-soft">
                Viešbučiams, poilsio kompleksams, SPA, vandenlenčių parkams ir daugiafunkciams objektams – kur apgyvendinimas yra
                tik dalis veiklos, o kaina priklauso nuo tikrų poreikių.
              </p>
              <p className="mb-1.5 text-[28px] font-semibold">Be skambučių</p>
              <p className="mb-3.5 text-sm text-ink-soft">Aprašykite raštu – atsakysime taip pat</p>
              <Gift>Pirmi 2 mėnesiai nemokamai – susipažinkite prieš derindami sprendimą</Gift>

              <div className="flex flex-1 flex-col gap-2.5">
                {status === "sent" ? (
                  <div role="status" className="flex flex-col gap-1.5 rounded-2xl bg-cream px-4 py-4">
                    <p className="text-sm font-bold text-teal-700">Ačiū – žinutė išsiųsta.</p>
                    <p className="text-sm leading-normal text-ink-soft">
                      Atsakysime per vieną darbo dieną adresu {email.trim()}. Tuo tarpu nemokama paskyra – vos
                      vienu paspaudimu.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submit} noValidate className="flex flex-col gap-2.5">
                    <p className="text-xs font-semibold text-teal-700">Norite pirmiausia aprašyti poreikius?</p>
                    <div>
                      <Label htmlFor="c-email" className="mb-1 text-xs text-ink-soft">El. paštas</Label>
                      <Input
                        id="c-email"
                        type="email"
                        autoComplete="email"
                        placeholder="jusu@objektas.lt"
                        value={email}
                        maxLength={255}
                        aria-invalid={emailError}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setEmailError(email.trim().length > 0 && !emailValid)}
                        className={cn(emailError && "border-destructive")}
                      />
                      {emailError && (
                        <p className="mt-1 text-xs text-destructive">Įveskite teisingą el. paštą, pvz., vardas@viesbutis.lt.</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="c-hotel" className="mb-1 text-xs text-ink-soft">Objekto pavadinimas</Label>
                      <Input
                        id="c-hotel"
                        autoComplete="organization"
                        placeholder="Jūsų viešbutis ar objektas"
                        value={hotel}
                        maxLength={160}
                        onChange={(e) => setHotel(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="c-msg" className="mb-1 text-xs text-ink-soft">Ką turėtume žinoti?</Label>
                      <Textarea
                        id="c-msg"
                        rows={3}
                        maxLength={3500}
                        placeholder="Objektų tipai, komandos dydis, ką siūlote be apgyvendinimo…"
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
                        Nepavyko išsiųsti. Pabandykite po akimirkos.
                      </p>
                    )}
                    <button type="submit" disabled={!canSend} className={cn(btn, "bg-cream-deep text-ink")}>
                      {status === "busy" ? "Siunčiama…" : "Siųsti"}
                    </button>
                    <p className="text-center text-xs text-ink-soft">Atsakome per 24 valandas · Jokio šlamšto</p>
                  </form>
                )}
              </div>
              <a href={TRIAL_REGISTRATION_URL} className={cn(btn, "mt-4 bg-teal-900 text-cream")}>
                Sukurti nemokamą paskyrą
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-[1000px] px-6">
          <div className="rounded-[20px] bg-cream-deep px-6 py-10 md:px-11">
            <div className="mb-7 text-center">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-amber-deep">Kad ir ką pasirinktumėte</p>
              <h2 className="font-display text-3xl font-semibold">Kiekvienas planas – visa sistema.</h2>
            </div>
            <ul className="grid grid-cols-1 gap-x-7 gap-y-5 sm:grid-cols-2 md:grid-cols-3">
              {PLATFORM.map((t) => (
                <li key={t} className="flex gap-2.5 text-sm leading-normal"><Check className="text-teal-700" />{t}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-[1000px] px-6">
          <h2 className="mb-7 text-center font-display text-[28px] font-semibold">Nežinote, kurį rinktis?</h2>
          <div className="flex flex-wrap gap-5">
            {[
              ["Ką tik pradėjote, nežinote apimties?", <>Pradėkite nuo <strong>„Mokate, kai uždirbate“</strong>. Jokios rizikos, kol įsivažiuojate.</>],
              ["Pastovios rezervacijos, norite vienos fiksuotos sąskaitos?", <><strong>„Mokate pagal vienetus“</strong> paprastai pigiau, kai tiesioginės rezervacijos reguliarios – pranešime, kada verta pereiti.</>],
              ["Valdote daugiau nei kambarius?", <>Rinkitės <strong>individualų</strong> planą – arba tiesiog registruokitės nemokamai ir parašykite, ko reikia.</>],
            ].map(([h, b], i) => (
              <div key={i} className="flex-[1_1_280px] rounded-2xl border border-ink/10 bg-card px-6 py-6">
                <h3 className="mb-2 font-sans text-sm font-bold text-teal-700">{h}</h3>
                <p className="text-sm leading-normal text-ink-soft">{b}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-[760px] px-6">
          <h2 className="mb-6 text-center font-display text-[28px] font-semibold">Atsakymai į klausimus apie kainas.</h2>
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
          <h2 className="mb-3.5 font-display text-3xl font-semibold text-cream">2 mėnesiai nemokamai kiekviename plane.</h2>
          <p className="mb-7 text-[15px] text-teal-100">
            Be kortelės. Be pardavimų skambučio prieigai gauti. Susikurkite paskyrą ir pamatykite savo skaičius.
          </p>
          <a
            href={TRIAL_REGISTRATION_URL}
            className="inline-flex min-h-11 items-center rounded-full bg-cream px-8 py-4 text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          >
            Pradėti nemokamai →
          </a>
        </section>
      </main>

      <footer className="px-6 py-7 text-center text-xs text-ink-soft">
        Revoo · revoostay.com · hello@revoostay.com
      </footer>
    </div>
  );
}
