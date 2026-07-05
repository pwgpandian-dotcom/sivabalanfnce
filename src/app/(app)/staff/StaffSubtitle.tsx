"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export function StaffSubtitle() {
  const { t } = useLocale();
  return <p className="mt-1 text-sm text-ink-soft">{t("staff", "subtitle")}</p>;
}
