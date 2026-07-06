"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise } from "@/lib/money";
import { LoanActionsMenu } from "./LoanActionsMenu";

export type ClosedLoan = {
  id: string;
  loanNumber: string;
  customerName: string;
  principalPaise: number;
  loanDate: string;
  closedDate: string | null;
  collectedPaise: number;
};

export function ClosedLoansTable({ loans }: { loans: ClosedLoan[] }) {
  const { t } = useLocale();

  if (loans.length === 0) {
    return (
      <div className="ledger-card rounded-2xl p-10 text-center text-ink-soft">
        {t("loanList", "closedEmpty")}
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
            <th className="px-4 py-3 text-right font-medium">{t("dashboard", "principal")}</th>
            <th className="px-4 py-3 font-medium">{t("loanList", "loanDate")}</th>
            <th className="px-4 py-3 font-medium">{t("loanList", "closedDate")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("loanList", "collected")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("actions", "title")}</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan.id} className="border-b border-gold-soft/60 last:border-0">
              <td className="px-4 py-3 font-mono text-ink">
                <Link href={`/loans/${loan.id}`} className="hover:text-wine hover:underline">
                  {loan.loanNumber}
                </Link>
              </td>
              <td className="px-4 py-3">{loan.customerName}</td>
              <td className="px-4 py-3 text-right font-mono">{formatPaise(loan.principalPaise)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-ink-soft">{loan.loanDate}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-ink-soft">{loan.closedDate ?? "—"}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-gold">
                {formatPaise(loan.collectedPaise)}
              </td>
              <td className="px-4 py-3 text-right">
                <LoanActionsMenu loanId={loan.id} loanNumber={loan.loanNumber} customerName={loan.customerName} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
