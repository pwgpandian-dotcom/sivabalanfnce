"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { TransactionsTable, type Transaction } from "../TransactionsTable";

export function TransactionsPageClient({ rows }: { rows: Transaction[] }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-2xl font-semibold text-wine">{t("transactions", "allTitle")}</h1>
        <span className="text-sm text-ink-soft">
          {rows.length} {t("transactions", "count")}
        </span>
      </div>
      <div className="ledger-card rounded-2xl p-6">
        <TransactionsTable rows={rows} />
      </div>
    </div>
  );
}
