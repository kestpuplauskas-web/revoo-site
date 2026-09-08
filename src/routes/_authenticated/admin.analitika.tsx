import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eye, Inbox, TrendingDown, TrendingUp, Users } from "lucide-react";

import { CARD } from "@/components/admin/ui";
import { Progress } from "@/components/ui/progress";
import {
  getAnalyticsSummary,
  percentChange,
  type AnalyticsRange,
} from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/admin/analitika")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: AnalyticsPage,
});

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: 7, label: "7 d." },
  { value: 30, label: "30 d." },
  { value: 90, label: "90 d." },
];

const SOURCE_LABEL: Record<string, string> = {
  direct: "Tiesioginiai",
  google: "Google",
  search: "Kitos paieškos",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  other: "Kitos svetainės",
};

const DEVICE_LABEL: Record<string, string> = {
  desktop: "Kompiuteris",
  mobile: "Telefonas",
  tablet: "Planšetė",
  unknown: "Nežinoma",
};

const countryNames = new Intl.DisplayNames(["lt"], { type: "region" });

function countryLabel(code: string): string {
  if (!code || code === "unknown") return "Nežinoma";
  try {
    return countryNames.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("lt-LT", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

function StatCard({
  label,
  value,
  change,
  icon: Icon,
  suffix,
}: {
  label: string;
  value: string | number;
  change?: number | null;
  icon: typeof Eye;
  suffix?: string;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center justify-between">
        <p className="eyebrow text-ink-soft">{label}</p>
        <Icon className="h-4 w-4 text-ink-soft" aria-hidden="true" />
      </div>
      <p className="mt-3 font-display text-3xl tabular-nums text-ink">
        {value}
        {suffix ? <span className="text-lg text-ink-soft">{suffix}</span> : null}
      </p>
      {change !== undefined && change !== null ? (
        <p
          className={`mt-2 flex items-center gap-1 text-xs ${positive ? "text-teal-700" : "text-destructive"}`}
        >
          {positive ? (
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {positive ? "+" : ""}
          {change}% lyginant su ankstesniu laikotarpiu
        </p>
      ) : null}
    </div>
  );
}

function BreakdownList({
  title,
  rows,
  total,
  empty,
}: {
  title: string;
  rows: { label: string; views: number }[];
  total: number;
  empty: string;
}) {
  return (
    <div className={`${CARD} p-5`}>
      <h2 className="text-sm font-medium text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="truncate pr-3 text-ink-soft">{row.label}</span>
                <span className="shrink-0 tabular-nums text-ink">{row.views}</span>
              </div>
              <Progress value={total ? (row.views / total) * 100 : 0} className="mt-1.5 h-1" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>(30);
  const fetchSummary = useServerFn(getAnalyticsSummary);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-analytics", range],
    queryFn: () => fetchSummary({ data: { range } }),
    staleTime: 60_000,
  });

  const chartData = useMemo(() => {
    const byDay = new Map((data?.daily ?? []).map((d) => [d.day, d]));
    const out: { day: string; label: string; views: number; visitors: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = byDay.get(key);
      out.push({
        day: key,
        label: shortDay(key),
        views: Number(row?.views ?? 0),
        visitors: Number(row?.visitors ?? 0),
      });
    }
    return out;
  }, [data, range]);

  const totalViews = Number(data?.totals?.views ?? 0);
  const totalVisitors = Number(data?.totals?.visitors ?? 0);
  const leads = Number(data?.leads ?? 0);
  const conversion = totalVisitors ? ((leads / totalVisitors) * 100).toFixed(1) : "0.0";

  return (
    <main className="px-4 py-8 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Analitika</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Savi lankomumo duomenys. Jokių slapukų, jokio trečiųjų šalių sekimo.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                range === r.value
                  ? "bg-teal-700 text-cream"
                  : "border border-ink/15 text-ink hover:bg-cream"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className={`${CARD} p-4 text-sm text-destructive`}>
          Nepavyko įkelti analitikos. {error instanceof Error ? error.message : ""}
        </div>
      ) : null}

      {isLoading ? (
        <div className={`${CARD} p-10 text-center text-sm text-ink-soft`}>Kraunama…</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Puslapių peržiūros"
              value={totalViews}
              change={percentChange(totalViews, Number(data?.previous?.views ?? 0))}
              icon={Eye}
            />
            <StatCard
              label="Unikalūs lankytojai"
              value={totalVisitors}
              change={percentChange(totalVisitors, Number(data?.previous?.visitors ?? 0))}
              icon={Users}
            />
            <StatCard label="Užklausos" value={leads} icon={Inbox} />
            <StatCard label="Konversija" value={conversion} suffix="%" icon={TrendingUp} />
          </div>

          <div className={`${CARD} mt-6 p-5`}>
            <h2 className="mb-4 text-sm font-medium text-ink">Srautas</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="views" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--teal-700)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--teal-700)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="visitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--amber)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--amber)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--ink-soft)" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--ink-soft)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Peržiūros"
                    stroke="var(--teal-700)"
                    fill="url(#views)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    name="Lankytojai"
                    stroke="var(--amber-deep)"
                    fill="url(#visitors)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <BreakdownList
              title="Šalys"
              total={totalViews}
              empty="Šalių duomenų dar nėra."
              rows={(data?.countries ?? []).map((c) => ({
                label: countryLabel(c.country),
                views: Number(c.views),
              }))}
            />
            <BreakdownList
              title="Populiariausi puslapiai"
              total={totalViews}
              empty="Peržiūrų dar nėra."
              rows={(data?.top_pages ?? []).map((p) => ({ label: p.path, views: Number(p.views) }))}
            />
            <BreakdownList
              title="Srauto šaltiniai"
              total={totalViews}
              empty="Šaltinių dar nėra."
              rows={(data?.sources ?? []).map((s) => ({
                label: SOURCE_LABEL[s.source] ?? s.source,
                views: Number(s.views),
              }))}
            />
            <BreakdownList
              title="Įrenginiai"
              total={totalViews}
              empty="Įrenginių dar nėra."
              rows={(data?.devices ?? []).map((d) => ({
                label: DEVICE_LABEL[d.device] ?? d.device,
                views: Number(d.views),
              }))}
            />
          </div>

          {totalViews === 0 ? (
            <p className="mt-6 text-sm text-ink-soft">
              Duomenys pradedami kaupti, kai šis atnaujinimas atsiduria viešoje svetainėje.
              Apsilankymai čia pasirodo per minutę.
            </p>
          ) : null}
        </>
      )}
    </main>
  );
}
