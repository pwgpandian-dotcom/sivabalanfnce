"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export function RePledgesSubtitle() {
  const { t } = useLocale();
  return <p className="mt-1 text-sm text-ink-soft">{t("rePledgeScreen", "subtitle")}</p>;
}
