"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export function CalculatorSubtitle() {
  const { t } = useLocale();
  return <p className="mt-1 text-sm text-ink-soft">{t("calculator", "subtitle")}</p>;
}
