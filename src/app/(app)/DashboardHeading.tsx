"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export function DashboardHeading() {
  const { t } = useLocale();
  return <h1 className="font-serif text-2xl font-semibold text-wine">{t("dashboard", "heading")}</h1>;
}

export function DashboardAddLoanLabel() {
  const { t } = useLocale();
  return <>{t("dashboard", "addLoan")}</>;
}
