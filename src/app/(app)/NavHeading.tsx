"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { dictionary } from "@/lib/i18n/dictionary";

type NavKey = keyof (typeof dictionary)["nav"];

/** Bilingual page heading that reuses a sidebar nav label, with an optional loan count. */
export function NavHeading({ navKey, count }: { navKey: NavKey; count?: number }) {
  const { t } = useLocale();
  return (
    <div className="flex items-baseline justify-between">
      <h1 className="font-serif text-2xl font-semibold text-wine">{t("nav", navKey)}</h1>
      {count !== undefined && (
        <span className="text-sm text-ink-soft">
          {count} {t("loanList", "count")}
        </span>
      )}
    </div>
  );
}
