"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { rupeesToPaise } from "@/lib/money";
import { StaffSelect } from "../../StaffSelect";

export type StaffLite = { userId: string; name: string };
export type LoanEdit = { id: string; edited_at: string; previous: Record<string, unknown> };

export type EditLoanValues = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  principalPaise: number;
  pledgeItem: string;
  pledgeWeightGrams: number | null;
  itemType: "gold" | "silver";
  loanDate: string;
  remarks: string | null;
  ratePercent: number | null;
  issuedBy: string | null;
  receivedBy: string | null;
};

export function EditLoanForm({
  loan,
  shopId,
  onCancel,
}: {
  loan: EditLoanValues;
  shopId: string;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [name, setName] = useState(loan.customerName);
  const [phone, setPhone] = useState(loan.customerPhone ?? "");
  const [address, setAddress] = useState(loan.customerAddress ?? "");
  const [principal, setPrincipal] = useState(String(loan.principalPaise / 100));
  const [pledgeItem, setPledgeItem] = useState(loan.pledgeItem);
  const [weight, setWeight] = useState(loan.pledgeWeightGrams != null ? String(loan.pledgeWeightGrams) : "");
  const [itemType, setItemType] = useState<"gold" | "silver">(loan.itemType);
  const [loanDate, setLoanDate] = useState(loan.loanDate);
  const [remarks, setRemarks] = useState(loan.remarks ?? "");
  const [rate, setRate] = useState(loan.ratePercent != null ? String(loan.ratePercent) : "");
  const [issuedBy, setIssuedBy] = useState(loan.issuedBy ?? "");
  const [receivedBy, setReceivedBy] = useState(loan.receivedBy ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input = "rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-ink outline-none focus:border-wine";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Customer details live on the shared customer row.
      const { error: custErr } = await supabase
        .from("customers")
        .update({ name: name.trim(), phone: phone.trim() || null, address: address.trim() || null })
        .eq("id", loan.customerId);
      if (custErr) throw new Error(custErr.message);

      // Loan fields + rate, with an audit snapshot, via the edit_loan RPC.
      const { error: rpcErr } = await supabase.rpc("edit_loan", {
        p_loan_id: loan.id,
        p_principal_paise: rupeesToPaise(parseFloat(principal)),
        p_pledge_item_description: pledgeItem.trim(),
        p_pledge_weight_grams: weight ? parseFloat(weight) : null,
        p_item_type: itemType,
        p_loan_date: loanDate,
        p_remarks: remarks.trim() || null,
        p_rate_percent: rate ? parseFloat(rate) : null,
        p_issued_by: issuedBy || null,
        p_received_by: receivedBy || null,
      });
      if (rpcErr) throw new Error(rpcErr.message);

      onCancel();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="ledger-card flex flex-col gap-4 rounded-2xl border-2 border-wine p-6">
      <h2 className="font-serif text-lg font-semibold text-wine">{t("loanDetail", "editLoan")}</h2>

      {/* Customer details */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "customerName")}
          <input value={name} onChange={(e) => setName(e.target.value)} required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "phone")}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "address")}
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
        </label>
      </div>

      {/* Loan + item details */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="col-span-2 flex flex-col gap-1 text-sm text-ink-soft sm:col-span-1">
          {t("newLoan", "pledgeItem")}
          <input value={pledgeItem} onChange={(e) => setPledgeItem(e.target.value)} required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "itemType")}
          <select value={itemType} onChange={(e) => setItemType(e.target.value as "gold" | "silver")} className={input}>
            <option value="gold">{t("newLoan", "gold")}</option>
            <option value="silver">{t("newLoan", "silver")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "pledgeWeight")}
          <input type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} className={`${input} font-mono`} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "principal")}
          <input type="number" step="0.01" value={principal} onChange={(e) => setPrincipal(e.target.value)} required className={`${input} font-mono`} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("loanDetail", "currentRate")}
          <input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} className={`${input} font-mono`} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "loanDate")}
          <input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} required className={`${input} font-mono`} />
        </label>
      </div>

      {/* Issuer / receiver */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "issuedBy")}
          <StaffSelect shopId={shopId} value={issuedBy} onChange={setIssuedBy} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "receivedBy")}
          <StaffSelect shopId={shopId} value={receivedBy} onChange={setReceivedBy} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        {t("newLoan", "remarks")}
        <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className={input} />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="rounded-lg bg-wine px-5 py-2 text-sm font-medium text-onwine hover:bg-wine-deep disabled:opacity-50">
          {saving ? t("common", "loading") : t("common", "save")}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-ink-soft hover:underline">
          {t("common", "cancel")}
        </button>
        {error && <span className="text-sm text-wine-soft">{error}</span>}
      </div>
    </form>
  );
}
