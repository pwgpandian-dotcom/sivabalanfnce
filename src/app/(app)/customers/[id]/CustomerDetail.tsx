"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise } from "@/lib/money";

export type CustomerLoanRow = {
  id: string;
  loan_number: string;
  principal_paise: number;
  loan_date: string;
  closed_date: string | null;
  status: "active" | "closed";
};

export function CustomerDetail({
  customer,
}: {
  customer: {
    name: string;
    phone: string | null;
    address: string | null;
    loans: CustomerLoanRow[];
  };
}) {
  const { t } = useLocale();
  const activeCount = customer.loans.filter((l) => l.status === "active").length;
  const closedCount = customer.loans.filter((l) => l.status === "closed").length;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/customers" className="text-sm text-wine hover:underline">
        ← {t("nav", "customers")}
      </Link>

      <div className="ledger-card rounded-2xl p-8">
        <h1 className="font-serif text-2xl font-semibold text-wine">{customer.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {customer.phone ?? "—"}
          {customer.address && ` · ${customer.address}`}
        </p>
        <div className="mt-4 flex gap-6 text-sm">
          <span>
            <span className="font-mono font-semibold text-wine">{activeCount}</span>{" "}
            <span className="text-ink-soft">{t("customers", "active")}</span>
          </span>
          <span>
            <span className="font-mono font-semibold text-gold">{closedCount}</span>{" "}
            <span className="text-ink-soft">{t("customers", "closed")}</span>
          </span>
        </div>
      </div>

      <div className="ledger-card rounded-2xl p-6">
        <h2 className="mb-3 font-serif text-lg font-semibold text-wine">
          {t("customers", "loanHistory")}
        </h2>
        {customer.loans.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-soft">{t("customers", "noLoans")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gold-soft text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-3 py-2 font-medium">{t("dashboard", "loanNumber")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("dashboard", "principal")}</th>
                  <th className="px-3 py-2 font-medium">{t("loanList", "loanDate")}</th>
                  <th className="px-3 py-2 font-medium">{t("customers", "status")}</th>
                </tr>
              </thead>
              <tbody>
                {customer.loans.map((loan) => (
                  <tr key={loan.id} className="border-b border-gold-soft/50 last:border-0">
                    <td className="px-3 py-2.5 font-mono">
                      <Link href={`/loans/${loan.id}`} className="hover:text-wine hover:underline">
                        {loan.loan_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatPaise(loan.principal_paise)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-ink-soft">{loan.loan_date}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          loan.status === "active" ? "bg-wine text-onwine" : "bg-ivory-deep text-ink-soft"
                        }`}
                      >
                        {t("loanStatus", loan.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
