"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { formatPaise } from "@/lib/money";
import { monthLabel } from "@/lib/month";

export type ClosureBucket = {
  monthKey: string; // "YYYY-MM"
  count: number;
  collectedPaise: number;
};

// Recharts takes literal color strings, so pick a palette per theme.
function chartColors(dark: boolean) {
  return {
    bar1: dark ? "#c76b80" : "#5e1224",
    bar2: dark ? "#cf9f3f" : "#b6862c",
    axis: dark ? "#b6a591" : "#6b5a4d",
    grid: dark ? "#b6862c" : "#e2c789",
    axisLine: dark ? "#5a2130" : "#e2c789",
    tooltipBg: dark ? "#23121a" : "#fffdf7",
    tooltipBorder: dark ? "#7a5a2a" : "#e2c789",
    tooltipText: dark ? "#efe6d6" : "#2a1810",
    cursor: dark ? "rgba(207,159,63,0.10)" : "rgba(94, 18, 36, 0.06)",
  };
}

export function ClosuresChart({ buckets }: { buckets: ClosureBucket[] }) {
  const { t, locale } = useLocale();
  const { theme } = useTheme();
  const c = chartColors(theme === "dark");
  const [range, setRange] = useState<6 | 12>(6);

  const data = useMemo(() => {
    const sliced = buckets.slice(-range);
    return sliced.map((b) => ({
      label: monthLabel(b.monthKey, locale),
      count: b.count,
      collected: b.collectedPaise / 100, // rupees for the axis
      collectedPaise: b.collectedPaise,
    }));
  }, [buckets, range, locale]);

  const hasData = data.some((d) => d.count > 0 || d.collectedPaise > 0);

  return (
    <div className="ledger-card rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-wine">{t("chart", "closuresTitle")}</h2>
        <div className="inline-flex rounded-full border border-gold-soft bg-ivory-deep p-0.5 text-xs font-medium">
          {([6, 12] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 transition-colors ${
                range === r ? "bg-wine text-onwine" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t("chart", r === 6 ? "range6" : "range12")}
            </button>
          ))}
        </div>
      </div>

      {hasData ? (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} strokeOpacity={0.4} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: c.axis }}
                axisLine={{ stroke: c.axisLine }}
                tickLine={false}
              />
              <YAxis
                yAxisId="count"
                allowDecimals={false}
                tick={{ fontSize: 12, fill: c.axis }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <YAxis
                yAxisId="money"
                orientation="right"
                tick={{ fontSize: 11, fill: c.axis }}
                axisLine={false}
                tickLine={false}
                width={54}
                tickFormatter={(v: number) =>
                  `₹${Number(v).toLocaleString("en-IN", { notation: "compact", maximumFractionDigits: 1 })}`
                }
              />
              <Tooltip
                cursor={{ fill: c.cursor }}
                contentStyle={{
                  background: c.tooltipBg,
                  border: `1px solid ${c.tooltipBorder}`,
                  borderRadius: 12,
                  fontSize: 13,
                  color: c.tooltipText,
                }}
                itemStyle={{ color: c.tooltipText }}
                labelStyle={{ color: c.tooltipText }}
                formatter={(value, name, item) => {
                  if (name === t("chart", "collected")) {
                    const paise = (item as { payload?: { collectedPaise?: number } })?.payload
                      ?.collectedPaise;
                    return [formatPaise(paise ?? 0), name];
                  }
                  return [value, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar
                yAxisId="count"
                dataKey="count"
                name={t("chart", "loansClosed")}
                fill={c.bar1}
                radius={[4, 4, 0, 0]}
                maxBarSize={38}
              />
              <Bar
                yAxisId="money"
                dataKey="collected"
                name={t("chart", "collected")}
                fill={c.bar2}
                radius={[4, 4, 0, 0]}
                maxBarSize={38}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="grid h-72 place-items-center text-sm text-ink-soft">{t("chart", "noData")}</div>
      )}
    </div>
  );
}
