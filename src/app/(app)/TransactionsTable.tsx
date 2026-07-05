"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise } from "@/lib/money";

export type Transaction = {
  id: string;
  loanId: string;
  loanNumber: string;
  customerName: string;
  paymentDate: string;
  amountPaise: number;
  paymentType: "interest" | "partial_principal" | "full_closing";
};

const TYPE_TONE: Record<Transaction["paymentType"], string> = {
  interest: "bg-gold-soft/40 text-ink",
  partial_principal: "bg-wine/10 text-wine",
  full_closing: "bg-wine text-onwine",
};

export function TransactionsTable({ rows }: { rows: Transaction[] }) {
  const { t } = useLocale();

  if (rows.length === 0) {
    return <div className="px-1 py-6 text-center text-sm text-ink-soft">{t("transactions", "empty")}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gold-soft text-left text-xs uppercase tracking-wide text-ink-soft">
            <th className="px-3 py-2 font-medium">{t("transactions", "date")}</th>
            <th className="px-3 py-2 font-medium">{t("transactions", "customer")}</th>
            <th className="px-3 py-2 font-medium">{t("transactions", "loanNumber")}</th>
            <th className="px-3 py-2 font-medium">{t("transactions", "type")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("transactions", "amount")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tx) => (
            <tr key={tx.id} className="border-b border-gold-soft/50 last:border-0">
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-ink-soft">{tx.paymentDate}</td>
              <td className="px-3 py-2.5">{tx.customerName}</td>
              <td className="px-3 py-2.5 font-mono">
                <Link href={`/loans/${tx.loanId}`} className="hover:text-wine hover:underline">
                  {tx.loanNumber}
                </Link>
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_TONE[tx.paymentType]}`}
                >
                  {t("paymentType", tx.paymentType)}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold text-wine">
                {formatPaise(tx.amountPaise)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
