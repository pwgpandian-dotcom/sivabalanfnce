"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { dictionary } from "@/lib/i18n/dictionary";
import { NewLoanIcon, CalculatorIcon, OverdueIcon, ReportsIcon } from "./icons";

type NavKey = keyof (typeof dictionary)["nav"];

const ACTIONS: {
  href: string;
  key: NavKey;
  Icon: (props: { className?: string }) => React.ReactElement;
}[] = [
  { href: "/loans/new", key: "newLoan", Icon: NewLoanIcon },
  { href: "/calculator", key: "calculator", Icon: CalculatorIcon },
  { href: "/loans/overdue", key: "overdue", Icon: OverdueIcon },
  { href: "/reports", key: "reports", Icon: ReportsIcon },
];

export function QuickActions() {
  const { t } = useLocale();
  return (
    <div className="ledger-card rounded-2xl p-6">
      <h2 className="mb-4 font-serif text-lg font-semibold text-wine">{t("quickActions", "title")}</h2>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map(({ href, key, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col items-center gap-2 rounded-xl border border-gold-soft bg-ivory px-3 py-4 text-center transition-colors hover:border-wine hover:bg-ivory-deep"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-wine text-gold-soft transition-colors group-hover:bg-wine-deep group-hover:text-gold-bright">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-ink">{t("nav", key)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
