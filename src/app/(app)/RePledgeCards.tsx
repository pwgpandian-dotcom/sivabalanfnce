"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise } from "@/lib/money";
import { RePledgeIcon, OverdueIcon, ClosedLoansIcon, ActiveLoansIcon } from "./icons";
import type { RePledgeStats } from "@/lib/dashboard";

export function RePledgeCards({ stats }: { stats: RePledgeStats }) {
  const { t } = useLocale();
  const cards = [
    { Icon: RePledgeIcon, label: t("rpCards", "total"), count: String(stats.totalRePledged), sub: t("rpCards", "totalSub") },
    { Icon: ActiveLoansIcon, label: t("rpCards", "today"), count: String(stats.todayRePledged), sub: t("rpCards", "todaySub") },
    { Icon: ClosedLoansIcon, label: t("rpCards", "redeemedToday"), count: String(stats.redeemedToday), sub: t("rpCards", "redeemedTodaySub") },
    { Icon: OverdueIcon, label: t("rpCards", "outstanding"), count: formatPaise(stats.outstandingPaise), sub: t("rpCards", "outstandingSub") },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Link
          key={c.label}
          href="/re-pledges"
          className="ledger-card relative overflow-hidden rounded-2xl p-5 transition-shadow before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-wine-soft before:content-[''] hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">{c.label}</div>
              <div className="mt-1 font-serif text-2xl font-bold text-wine-soft">{c.count}</div>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-wine-soft text-onwine">
              <c.Icon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 border-t border-gold-soft/50 pt-2 text-[11px] uppercase tracking-wide text-ink-soft">
            {c.sub}
          </div>
        </Link>
      ))}
    </div>
  );
}
