"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export function AddCustomerLabel() {
  const { t } = useLocale();
  return <>{t("customers", "addCustomer")}</>;
}
