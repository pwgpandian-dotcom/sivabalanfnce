"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise } from "@/lib/money";
import { ActiveLoansIcon, OverdueIcon, ClosedLoansIcon, CustomersIcon } from "./icons";

export type SummaryStats = {
  activeCount: number;
  activePrincipalPaise: number;
  overdueCount: number;
  overduePrincipalPaise: number;
  closedCount: number;
  closedCollectedPaise: number;
  customerCount: number;
};

type Tone = "wine" | "overdue" | "gold" | "ink";

const TONES: Record<
  Tone,
  { chip: string; value: string; ring: string }
> = {
  // Chip = colored icon badge; value = the big number color; ring = subtle top accent.
  wine: { chip: "bg-wine text-onwine", value: "text-wine", ring: "before:bg-wine" },
  overdue: { chip: "bg-wine-soft text-onwine", value: "text-wine-soft", ring: "before:bg-wine-soft" },
  gold: { chip: "bg-gold text-wine-deep", value: "text-gold", ring: "before:bg-gold" },
  ink: { chip: "bg-ink text-gold-soft", value: "text-ink", ring: "before:bg-ink-soft" },
};

function Card({
  tone,
  Icon,
  label,
  count,
  sub,
  subValue,
  href,
}: {
  tone: Tone;
  Icon: (props: { className?: string }) => React.ReactElement;
  label: string;
  count: number;
  sub: string;
  subValue: string;
  href?: string;
}) {
  const c = TONES[tone];
  const body = (
    <div
      className={`ledger-card relative overflow-hidden rounded-2xl p-5 transition-shadow before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-[''] ${c.ring} ${
        href ? "hover:shadow-md" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</div>
          <div className={`mt-1 font-serif text-3xl font-bold ${c.value}`}>{count}</div>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${c.chip}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 border-t border-gold-soft/50 pt-2">
        <div className="text-[11px] uppercase tracking-wide text-ink-soft">{sub}</div>
        <div className="font-mono text-sm font-semibold text-ink">{subValue}</div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export function SummaryCards({ stats }: { stats: SummaryStats }) {
  const { t } = useLocale();
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card
        tone="wine"
        Icon={ActiveLoansIcon}
        label={t("cards", "activeLoans")}
        count={stats.activeCount}
        sub={t("cards", "activeSub")}
        subValue={formatPaise(stats.activePrincipalPaise)}
        href="/loans/active"
      />
      <Card
        tone="overdue"
        Icon={OverdueIcon}
        label={t("cards", "overdue")}
        count={stats.overdueCount}
        sub={t("cards", "overdueSub")}
        subValue={formatPaise(stats.overduePrincipalPaise)}
        href="/loans/overdue"
      />
      <Card
        tone="gold"
        Icon={ClosedLoansIcon}
        label={t("cards", "closed")}
        count={stats.closedCount}
        sub={t("cards", "closedSub")}
        subValue={formatPaise(stats.closedCollectedPaise)}
        href="/loans/closed"
      />
      <Card
        tone="ink"
        Icon={CustomersIcon}
        label={t("cards", "customers")}
        count={stats.customerCount}
        sub={t("cards", "customersSub")}
        subValue={String(stats.customerCount)}
        href="/customers"
      />
    </div>
  );
}
