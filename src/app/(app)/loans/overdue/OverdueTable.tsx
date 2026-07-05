"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { DashboardTable, type DashboardLoan } from "../../DashboardTable";

export function OverdueTable({ loans }: { loans: DashboardLoan[] }) {
  const { t } = useLocale();
  return <DashboardTable loans={loans} emptyLabel={t("loanList", "overdueEmpty")} />;
}
