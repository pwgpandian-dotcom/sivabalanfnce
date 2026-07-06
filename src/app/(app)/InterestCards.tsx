"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise } from "@/lib/money";
import type { InterestStats } from "@/lib/dashboard";

export function InterestCards({ stats }: { stats: InterestStats }) {
  const { t } = useLocale();
  const cards: { label: string; value: number; tone: "gold" | "wine" }[] = [
    { label: t("interestCards", "dailyIssued"), value: stats.dailyIssuedPaise, tone: "wine" },
    { label: t("interestCards", "dailyReturned"), value: stats.dailyReturnedPaise, tone: "wine" },
    { label: t("interestCards", "outstanding"), value: stats.outstandingPaise, tone: "wine" },
    { label: t("interestCards", "todayInterest"), value: stats.todayInterestPaise, tone: "gold" },
    { label: t("interestCards", "monthlyInterest"), value: stats.monthlyInterestPaise, tone: "gold" },
    { label: t("interestCards", "overallInterest"), value: stats.overallInterestPaise, tone: "gold" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`ledger-card relative overflow-hidden rounded-2xl p-5 before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-[''] ${
            c.tone === "gold" ? "before:bg-gold" : "before:bg-wine"
          }`}
        >
          <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">{c.label}</div>
          <div className={`mt-1 font-mono text-xl font-bold ${c.tone === "gold" ? "text-gold" : "text-wine"}`}>
            {formatPaise(c.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
