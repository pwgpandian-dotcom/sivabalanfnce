"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise, rupeesToPaise } from "@/lib/money";

export type MigratedLoan = {
  id: string;
  loan_number: string;
  customer_name: string;
  principal_paise: number;
  assessed_value_paise: number | null;
  pledge_item_description: string;
  pledge_weight_grams: number | null;
  loan_date: string;
  rate_percent: number | null;
  rate_segment_id: string | null;
};

export function MigratedLoansList({ loans }: { loans: MigratedLoan[] }) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm(t("oldLoan", "deleteConfirm"))) return;
    const { error: delError } = await supabase.from("loans").delete().eq("id", id);
    if (delError) {
      setError(delError.message);
      return;
    }
    router.refresh();
  }

  if (loans.length === 0) {
    return <div className="ledger-card rounded-2xl p-8 text-center text-ink-soft">{t("oldLoan", "empty")}</div>;
  }

  return (
    <div className="ledger-card overflow-hidden rounded-2xl">
      {error && <p className="px-4 pt-3 text-sm text-wine-soft">{error}</p>}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gold-soft bg-ivory-deep text-left text-xs uppercase tracking-wide text-ink-soft">
            <th className="px-4 py-3 font-medium">{t("dashboard", "loanNumber")}</th>
            <th className="px-4 py-3 font-medium">{t("dashboard", "customer")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("dashboard", "principal")}</th>
            <th className="px-4 py-3 font-medium">{t("loanList", "loanDate")}</th>
            <th className="px-4 py-3 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) =>
            editing === loan.id ? (
              <EditRow
                key={loan.id}
                loan={loan}
                supabase={supabase}
                onDone={() => {
                  setEditing(null);
                  router.refresh();
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <tr key={loan.id} className="border-b border-gold-soft/60 last:border-0">
                <td className="px-4 py-3 font-mono">
                  <Link href={`/loans/${loan.id}`} className="hover:text-wine hover:underline">
                    {loan.loan_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{loan.customer_name}</td>
                <td className="px-4 py-3 text-right font-mono">{formatPaise(loan.principal_paise)}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-ink-soft">{loan.loan_date}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button onClick={() => setEditing(loan.id)} className="text-xs text-wine hover:underline">
                    {t("oldLoan", "edit")}
                  </button>
                  <button onClick={() => handleDelete(loan.id)} className="ml-3 text-xs text-wine-soft hover:underline">
                    {t("oldLoan", "delete")}
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function EditRow({
  loan,
  supabase,
  onDone,
  onCancel,
}: {
  loan: MigratedLoan;
  supabase: ReturnType<typeof createClient>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const [loanNumber, setLoanNumber] = useState(loan.loan_number);
  const [principal, setPrincipal] = useState(String(loan.principal_paise / 100));
  const [assessed, setAssessed] = useState(loan.assessed_value_paise != null ? String(loan.assessed_value_paise / 100) : "");
  const [item, setItem] = useState(loan.pledge_item_description);
  const [weight, setWeight] = useState(loan.pledge_weight_grams != null ? String(loan.pledge_weight_grams) : "");
  const [loanDate, setLoanDate] = useState(loan.loan_date);
  const [rate, setRate] = useState(loan.rate_percent != null ? String(loan.rate_percent) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cell = "rounded border border-gold-soft bg-ivory px-2 py-1 font-mono text-xs outline-none focus:border-wine";

  async function save() {
    setSaving(true);
    setError(null);
    const { error: updErr } = await supabase
      .from("loans")
      .update({
        loan_number: loanNumber.trim(),
        principal_paise: rupeesToPaise(parseFloat(principal)),
        assessed_value_paise: assessed ? rupeesToPaise(parseFloat(assessed)) : null,
        pledge_item_description: item.trim(),
        pledge_weight_grams: weight ? parseFloat(weight) : null,
        loan_date: loanDate,
      })
      .eq("id", loan.id);
    if (updErr) {
      setSaving(false);
      setError(updErr.code === "23505" ? t("newLoan", "loanNumberTaken") : updErr.message);
      return;
    }
    if (loan.rate_segment_id && rate) {
      await supabase.from("interest_rate_segments").update({ rate_percent: parseFloat(rate) }).eq("id", loan.rate_segment_id);
    }
    setSaving(false);
    onDone();
  }

  return (
    <tr className="border-b border-gold-soft/60 bg-ivory-deep/40">
      <td colSpan={5} className="px-4 py-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="flex flex-col gap-0.5 text-[10px] uppercase text-ink-soft">
            {t("oldLoan", "pawnId")}
            <input value={loanNumber} onChange={(e) => setLoanNumber(e.target.value)} className={cell} />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] uppercase text-ink-soft">
            {t("newLoan", "principal")}
            <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} className={cell} />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] uppercase text-ink-soft">
            {t("newLoan", "assessedValue")}
            <input type="number" value={assessed} onChange={(e) => setAssessed(e.target.value)} className={cell} />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] uppercase text-ink-soft">
            {t("newLoan", "rate")}
            <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className={cell} />
          </label>
          <label className="col-span-2 flex flex-col gap-0.5 text-[10px] uppercase text-ink-soft">
            {t("newLoan", "pledgeItem")}
            <input value={item} onChange={(e) => setItem(e.target.value)} className={cell.replace("font-mono ", "")} />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] uppercase text-ink-soft">
            {t("newLoan", "pledgeWeight")}
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className={cell} />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] uppercase text-ink-soft">
            {t("newLoan", "loanDate")}
            <input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} className={cell} />
          </label>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button onClick={save} disabled={saving} className="rounded-lg bg-wine px-3 py-1 text-xs font-medium text-onwine hover:bg-wine-deep disabled:opacity-50">
            {t("common", "save")}
          </button>
          <button onClick={onCancel} className="text-xs text-ink-soft hover:underline">
            {t("common", "cancel")}
          </button>
          {error && <span className="text-xs text-wine-soft">{error}</span>}
        </div>
      </td>
    </tr>
  );
}
