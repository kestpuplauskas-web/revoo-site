import type { ReactNode } from "react";
import type { CurrencyTotals } from "@/lib/clients.functions";
import { formatMoney } from "@/lib/admin-format";

export const CARD = "rounded-3xl bg-white shadow-[0_20px_60px_-50px_rgba(8,32,30,0.6)]";
export const INPUT =
  "w-full rounded-2xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-teal-500";
export const BTN =
  "rounded-full bg-teal-700 px-5 py-2.5 text-sm text-cream transition-colors hover:bg-teal-800 disabled:opacity-60";
export const BTN_GHOST =
  "rounded-full border border-ink/15 px-5 py-2.5 text-sm text-ink transition-colors hover:bg-ink hover:text-cream";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string | undefined;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs tracking-wide text-ink-soft uppercase">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-soft">{hint}</span> : null}
    </label>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "warn" }) {
  const tones = {
    muted: "bg-cream text-ink-soft",
    accent: "bg-teal-700 text-cream",
    warn: "bg-amber text-ink",
  } as const;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>
  );
}

export function KpiCard({
  label,
  value,
  totals,
  note,
}: {
  label: string;
  value?: number | string | undefined;
  totals?: CurrencyTotals | undefined;
  note?: string | undefined;
}) {
  return (
    <div className={`${CARD} p-5`}>
      <p className="text-xs tracking-wide text-ink-soft uppercase">{label}</p>
      {totals ? (
        totals.length === 0 ? (
          <p className="mt-2 font-display text-3xl text-ink">—</p>
        ) : (
          <ul className="mt-2 space-y-0.5">
            {totals.map((t) => (
              <li key={t.currency} className="font-display text-2xl text-ink">
                {formatMoney(t.total, t.currency)}
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="mt-2 font-display text-3xl text-ink">
          {value === 0 || value === undefined || value === null || value === "" ? "—" : value}
        </p>
      )}
      {note ? <p className="mt-2 text-xs text-ink-soft">{note}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LinkButtons({
  links,
}: {
  links: { label: string; url: string | null | undefined }[];
}) {
  const usable = links.filter((l) => l.url && l.url.trim().length > 0);
  if (usable.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {usable.map((l) => (
        <a
          key={l.label}
          href={l.url as string}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink transition-colors hover:bg-ink hover:text-cream"
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}

export function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-44 shrink-0 text-ink-soft">{label}</dt>
      <dd className="min-w-0 flex-1 text-ink">{value || "—"}</dd>
    </div>
  );
}
