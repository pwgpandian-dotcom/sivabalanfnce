"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { TransactionsTable, type Transaction } from "./TransactionsTable";

export function RecentTransactions({ rows }: { rows: Transaction[] }) {
  const { t } = useLocale();
  return (
    <div className="ledger-card rounded-2xl p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-wine">{t("transactions", "recentTitle")}</h2>
        <Link href="/transactions" className="text-sm text-wine hover:underline">
          {t("transactions", "viewAll")} →
        </Link>
      </div>
      <TransactionsTable rows={rows} />
    </div>
  );
}
