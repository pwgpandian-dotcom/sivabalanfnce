"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { NavHeading } from "../../NavHeading";
import { OldLoanForm } from "./OldLoanForm";
import { MigratedLoansList, type MigratedLoan } from "./MigratedLoansList";

export function OldLoanScreen({
  shopId,
  endingId,
  migrationModeEnabled,
  loans,
}: {
  shopId: string;
  endingId: number;
  migrationModeEnabled: boolean;
  loans: MigratedLoan[];
}) {
  const { t } = useLocale();

  if (!migrationModeEnabled) {
    return (
      <div className="flex flex-col gap-6">
        <NavHeading navKey="addOldLoan" />
        <div className="ledger-card rounded-2xl p-10 text-center text-ink-soft">
          {t("oldLoan", "disabled")}{" "}
          <Link href="/settings" className="text-wine hover:underline">
            {t("nav", "settings")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <NavHeading navKey="addOldLoan" />
        <p className="mt-1 text-sm text-ink-soft">{t("oldLoan", "subtitle")}</p>
      </div>
      <OldLoanForm shopId={shopId} endingId={endingId} />
      <h2 className="font-serif text-lg font-semibold text-wine">{t("oldLoan", "recordsTitle")}</h2>
      <MigratedLoansList loans={loans} />
    </div>
  );
}
