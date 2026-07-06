"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise } from "@/lib/money";
import { OVERDUE_THRESHOLD_DAYS } from "@/lib/loans";
import { LoanActionsMenu } from "./LoanActionsMenu";

export type DashboardLoan = {
  id: string;
  loanNumber: string;
  customerName: string;
  principalPaise: number;
  daysElapsed: number;
  // Days since the last interest payment (or the loan date if none). Drives the
  // overdue flag — a loan is overdue when interest hasn't been paid for a while.
  overdueDays: number;
  // Interest already collected from the customer (incl. first-month interest
  // deducted at issuance) — NOT the outstanding balance.
  interestPaidPaise: number;
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
    <div className="ledger-card overflow-x-auto rounded-2xl">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gold-soft bg-ivory-deep text-left text-xs uppercase tracking-wide text-ink-soft">
            <th className="px-4 py-3 font-medium">{t("dashboard", "loanNumber")}</th>
            <th className="px-4 py-3 font-medium">{t("dashboard", "customer")}</th>
            <th className="px-4 py-3 font-medium">{t("rePledgeScreen", "status")}</th>
            <th className="px-4 py-3 font-medium text-right">{t("dashboard", "principal")}</th>
            <th className="px-4 py-3 font-medium text-right">{t("dashboard", "daysElapsed")}</th>
            <th className="px-4 py-3 font-medium text-right">{t("dashboard", "interestPaid")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("actions", "title")}</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => {
            const overdue = loan.overdueDays >= OVERDUE_THRESHOLD_DAYS;
            const rePledged = Boolean(loan.rePledgeBroker);
            return (
              <tr key={loan.id} className={`border-b border-gold-soft/60 last:border-0 ${overdue ? "bg-wine/5" : ""}`}>
                <td className="px-4 py-3 font-mono text-ink">
                  <Link href={`/loans/${loan.id}`} className="hover:text-wine hover:underline">
                    {loan.loanNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{loan.customerName}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      rePledged ? "bg-wine-soft/15 text-wine-soft" : "bg-green-700/10 text-green-800"
                    }`}
                  >
                    {t("pledgeStatus", rePledged ? "rePledged" : "inShop")}
                  </span>
                  {rePledged && <div className="mt-0.5 text-[10px] text-ink-soft">{loan.rePledgeBroker}</div>}
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
                  {formatPaise(loan.interestPaidPaise)}
                </td>
                <td className="px-4 py-3 text-right">
                  <LoanActionsMenu loanId={loan.id} loanNumber={loan.loanNumber} customerName={loan.customerName} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
