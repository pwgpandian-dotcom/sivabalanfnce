"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise } from "@/lib/money";
import { OVERDUE_THRESHOLD_DAYS } from "@/lib/loans";

export type DashboardLoan = {
  id: string;
  loanNumber: string;
  customerName: string;
  principalPaise: number;
  daysElapsed: number;
  interestOwedPaise: number;
  rePledgeBroker?: string | null;
};

export function DashboardTable({ loans, emptyLabel }: { loans: DashboardLoan[]; emptyLabel?: string }) {
  const { t } = useLocale();

  if (loans.length === 0) {
    return (
      <div className="ledger-card rounded-2xl p-10 text-center text-ink-soft">
        {emptyLabel ?? t("dashboard", "empty")}
      </div>
    );
  }

  return (
    <div className="ledger-card overflow-hidden rounded-2xl">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gold-soft bg-ivory-deep text-left text-xs uppercase tracking-wide text-ink-soft">
            <th className="px-4 py-3 font-medium">{t("dashboard", "loanNumber")}</th>
            <th className="px-4 py-3 font-medium">{t("dashboard", "customer")}</th>
            <th className="px-4 py-3 font-medium text-right">{t("dashboard", "principal")}</th>
            <th className="px-4 py-3 font-medium text-right">{t("dashboard", "daysElapsed")}</th>
            <th className="px-4 py-3 font-medium text-right">{t("dashboard", "interestOwed")}</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => {
            const overdue = loan.daysElapsed >= OVERDUE_THRESHOLD_DAYS;
            return (
              <tr key={loan.id} className={`border-b border-gold-soft/60 last:border-0 ${overdue ? "bg-wine/5" : ""}`}>
                <td className="px-4 py-3 font-mono text-ink">
                  <Link href={`/loans/${loan.id}`} className="hover:text-wine hover:underline">
                    {loan.loanNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {loan.customerName}
                  {loan.rePledgeBroker && (
                    <span
                      className="ml-2 inline-block rounded-full border border-wine bg-wine/10 px-2 py-0.5 text-[10px] font-medium text-wine"
                      title={`${t("rePledge", "withBroker")} ${loan.rePledgeBroker}`}
                    >
                      {t("rePledge", "withBroker")} {loan.rePledgeBroker}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatPaise(loan.principalPaise)}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {loan.daysElapsed}
                  {overdue && (
                    <span className="ml-2 rounded-full bg-wine px-2 py-0.5 text-[10px] font-sans uppercase tracking-wide text-gold-soft">
                      {t("dashboard", "overdue")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-wine">
                  {formatPaise(loan.interestOwedPaise)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
