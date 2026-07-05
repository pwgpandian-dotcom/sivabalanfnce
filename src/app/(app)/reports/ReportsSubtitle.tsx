"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export function ReportsSubtitle() {
  const { t } = useLocale();
  return <p className="mt-1 text-sm text-ink-soft">{t("reports", "subtitle")}</p>;
}
