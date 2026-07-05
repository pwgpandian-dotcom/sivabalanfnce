"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise, rupeesToPaise, toDateInputValue } from "@/lib/money";

export type RePledge = {
  id: string;
  larger_broker_name: string;
  larger_broker_receipt_number: string | null;
  amount_received_paise: number | null;
  interest_rate_percent: number | null;
  pledge_date: string;
  status: "active" | "redeemed";
  redeemed_date: string | null;
  notes: string | null;
};

export function RePledgeSection({
  loanId,
  loanNumber,
  rePledges,
}: {
  loanId: string;
  loanNumber: string;
  rePledges: RePledge[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [showForm, setShowForm] = useState(false);
  const [brokerName, setBrokerName] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [brokerRate, setBrokerRate] = useState("");
  const [pledgeDate, setPledgeDate] = useState(toDateInputValue(new Date()));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Known brokers (this shop) for the broker-name autocomplete dropdown.
  const [brokers, setBrokers] = useState<string[]>([]);
  useEffect(() => {
    supabase
      .from("re_pledges")
      .select("larger_broker_name")
      .then(({ data }) => {
        if (data) setBrokers([...new Set(data.map((d) => d.larger_broker_name).filter(Boolean))]);
      });
  }, [supabase]);

  const inputClass =
    "rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-ink outline-none focus:border-wine";

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("re_pledges").insert({
      loan_id: loanId,
      larger_broker_name: brokerName.trim(),
      larger_broker_receipt_number: receiptNumber.trim() || null,
      amount_received_paise: amount ? rupeesToPaise(parseFloat(amount)) : null,
      interest_rate_percent: brokerRate ? parseFloat(brokerRate) : null,
      pledge_date: pledgeDate,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setShowForm(false);
    setBrokerName("");
    setReceiptNumber("");
    setAmount("");
    setBrokerRate("");
    setNotes("");
    router.refresh();
  }

  async function markRedeemed(id: string) {
    const { error: updateError } = await supabase
      .from("re_pledges")
      .update({ status: "redeemed", redeemed_date: toDateInputValue(new Date()) })
      .eq("id", id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="ledger-card rounded-2xl p-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-wine">{t("rePledge", "title")}</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="text-sm text-wine hover:underline">
            {t("rePledge", "add")}
          </button>
        )}
      </div>

      {/* Existing re-pledges */}
      <ul className="flex flex-col gap-3">
        {rePledges.length === 0 && !showForm && (
          <li className="text-sm text-ink-soft">{t("rePledge", "empty")}</li>
        )}
        {rePledges.map((rp) => (
          <li key={rp.id} className="rounded-xl border border-gold-soft bg-ivory-deep/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium text-ink">
                {t("rePledge", "withBroker")} <span className="text-wine">{rp.larger_broker_name}</span>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  rp.status === "active" ? "bg-wine text-onwine" : "bg-ivory-deep text-ink-soft"
                }`}
              >
                {t("rePledge", rp.status === "active" ? "statusActive" : "statusRedeemed")}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm text-ink-soft sm:grid-cols-3">
              {rp.larger_broker_receipt_number && (
                <span>
                  {t("rePledge", "receiptNumber")}: {rp.larger_broker_receipt_number}
                </span>
              )}
              {rp.amount_received_paise != null && (
                <span>
                  {t("rePledge", "amountReceived")}: {formatPaise(rp.amount_received_paise)}
                </span>
              )}
              {rp.interest_rate_percent != null && (
                <span>
                  {t("rePledge", "brokerRate")}: {rp.interest_rate_percent}%
                </span>
              )}
              <span>
                {t("rePledge", "pledgeDate")}: {rp.pledge_date}
              </span>
              {rp.status === "redeemed" && rp.redeemed_date && (
                <span>
                  {t("rePledge", "redeemedOn")}: {rp.redeemed_date}
                </span>
              )}
            </div>
            {rp.notes && <p className="mt-1 text-sm text-ink-soft">{rp.notes}</p>}
            {rp.status === "active" && (
              <button
                onClick={() => markRedeemed(rp.id)}
                className="mt-3 rounded-lg border border-wine px-3 py-1 text-xs text-wine transition-colors hover:bg-wine hover:text-onwine"
              >
                {t("rePledge", "markRedeemed")}
              </button>
            )}
          </li>
        ))}
      </ul>

      {showForm && (
        <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-3 border-t border-gold-soft pt-4">
          {/* Cross-reference hint with the loan's own number */}
          <p className="rounded-lg border border-gold-soft bg-gold-soft/20 px-3 py-2 text-sm text-ink">
            {t("rePledge", "refHint")} <span className="font-mono font-semibold text-wine">{loanNumber}</span>
          </p>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("rePledge", "brokerName")}
            <input
              value={brokerName}
              onChange={(e) => setBrokerName(e.target.value)}
              required
              list="known-brokers"
              className={inputClass}
            />
            <datalist id="known-brokers">
              {brokers.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("rePledge", "receiptNumber")}
              <input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} className={`${inputClass} font-mono`} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("rePledge", "pledgeDate")}
              <input type="date" value={pledgeDate} onChange={(e) => setPledgeDate(e.target.value)} required className={`${inputClass} font-mono`} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("rePledge", "amountReceived")}
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} font-mono`} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("rePledge", "brokerRate")}
              <input type="number" step="0.01" value={brokerRate} onChange={(e) => setBrokerRate(e.target.value)} className={`${inputClass} font-mono`} />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("rePledge", "notes")}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-wine px-4 py-2 text-sm font-medium text-onwine hover:bg-wine-deep disabled:opacity-50"
            >
              {submitting ? t("common", "loading") : t("common", "save")}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-ink-soft hover:underline">
              {t("common", "cancel")}
            </button>
          </div>
          {error && <p className="text-sm text-wine-soft">{error}</p>}
        </form>
      )}
    </div>
  );
}
