"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { rupeesToPaise } from "@/lib/money";
import { CustomerPicker, type PickerValue } from "./CustomerPicker";

export function OldLoanForm({ shopId, endingId }: { shopId: string; endingId: number }) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [customer, setCustomer] = useState<PickerValue>({ mode: "none" });
  const [pawnId, setPawnId] = useState("");
  const [pledgeItem, setPledgeItem] = useState("");
  const [pledgeWeight, setPledgeWeight] = useState("");
  const [itemType, setItemType] = useState<"gold" | "silver">("gold");
  const [itemCount, setItemCount] = useState("1");
  const [principal, setPrincipal] = useState("");
  const [assessedValue, setAssessedValue] = useState("");
  const [rate, setRate] = useState("");
  const [loanDate, setLoanDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass = "rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono text-ink outline-none focus:border-wine";

  async function resolveCustomerId(): Promise<string> {
    if (customer.mode === "selected") return customer.customer.id;
    if (customer.mode === "new") {
      const { data, error: insertError } = await supabase
        .from("customers")
        .insert({
          shop_id: shopId,
          name: customer.name.trim(),
          phone: customer.phone.trim() || null,
          address: customer.address.trim() || null,
        })
        .select("id")
        .single();
      if (insertError || !data) throw new Error(insertError?.message ?? "Could not create customer");
      return data.id;
    }
    throw new Error("Select an existing customer or add a new one.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const pawn = parseInt(pawnId, 10);
    if (!Number.isInteger(pawn) || pawn < 1 || pawn > endingId) {
      setError(`${t("oldLoan", "pawnIdRange")} ${endingId}.`);
      return;
    }

    setSubmitting(true);
    try {
      const customerId = await resolveCustomerId();
      const { data, error: rpcError } = await supabase.rpc("create_loan", {
        p_customer_id: customerId,
        p_principal_paise: rupeesToPaise(parseFloat(principal)),
        p_pledge_item_description: pledgeItem.trim(),
        p_pledge_weight_grams: pledgeWeight ? parseFloat(pledgeWeight) : null,
        p_loan_date: loanDate,
        p_initial_rate_percent: parseFloat(rate),
        p_loan_number: String(pawn),
        p_assessed_value_paise: assessedValue ? rupeesToPaise(parseFloat(assessedValue)) : null,
        p_is_migrated: true,
        p_item_type: itemType,
        p_remarks: remarks.trim() || null,
        p_issued_by: issuedBy.trim() || null,
        p_received_by: receivedBy.trim() || null,
        p_item_count: itemCount ? Math.max(1, parseInt(itemCount, 10) || 1) : 1,
      });

      if (rpcError) {
        if (rpcError.code === "23505") {
          setError(t("newLoan", "loanNumberTaken"));
          return;
        }
        throw new Error(rpcError.message);
      }

      // Stay on the screen (migration is a batch task); reset + refresh the list.
      void data;
      setCustomer({ mode: "none" });
      setPawnId("");
      setPledgeItem("");
      setPledgeWeight("");
      setItemCount("1");
      setPrincipal("");
      setAssessedValue("");
      setRate("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ledger-card flex flex-col gap-5 rounded-2xl p-8">
      <div className="flex flex-col gap-2">
        <label className="text-sm text-ink-soft">{t("newLoan", "customer")}</label>
        <CustomerPicker shopId={shopId} value={customer} onChange={setCustomer} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("oldLoan", "pawnId")}
          <input
            type="number"
            min={1}
            max={endingId}
            value={pawnId}
            onChange={(e) => setPawnId(e.target.value)}
            required
            className={inputClass}
          />
          <span className="text-[10px] text-ink-soft">
            {t("oldLoan", "pawnIdRange")} {endingId}
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "loanDate")}
          <input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} required className={inputClass} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "pledgeItem")}
          <input value={pledgeItem} onChange={(e) => setPledgeItem(e.target.value)} required className={inputClass.replace("font-mono ", "")} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "itemType")}
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value as "gold" | "silver")}
            className={inputClass.replace("font-mono ", "")}
          >
            <option value="gold">{t("newLoan", "gold")}</option>
            <option value="silver">{t("newLoan", "silver")}</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "itemCount")}
          <input type="number" min={1} step={1} value={itemCount} onChange={(e) => setItemCount(e.target.value)} className={inputClass} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "pledgeWeight")}
          <input type="number" step="0.01" value={pledgeWeight} onChange={(e) => setPledgeWeight(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "principal")}
          <input type="number" step="0.01" value={principal} onChange={(e) => setPrincipal(e.target.value)} required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "assessedValue")}
          <input type="number" step="0.01" value={assessedValue} onChange={(e) => setAssessedValue(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "rate")}
          <input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} required className={inputClass} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "issuedBy")}
          <input value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} placeholder={t("newLoan", "enterName")} className={inputClass.replace("font-mono ", "")} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("newLoan", "receivedBy")}
          <input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder={t("newLoan", "enterName")} className={inputClass.replace("font-mono ", "")} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        {t("newLoan", "remarks")}
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={2}
          className={inputClass.replace("font-mono ", "")}
        />
      </label>

      {/* Receipt photo — flagged, needs a Storage bucket before wiring the upload. */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-ink-soft">{t("oldLoan", "photo")}</label>
        <input type="file" accept="image/*" disabled className="text-sm text-ink-soft file:mr-3 file:rounded-lg file:border file:border-gold-soft file:bg-ivory-deep file:px-3 file:py-1 file:text-ink-soft disabled:opacity-60" />
        <span className="text-[10px] text-wine-soft">{t("oldLoan", "photoNeedsSetup")}</span>
      </div>

      {error && <p className="text-sm text-wine-soft">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 self-start rounded-lg bg-wine px-5 py-2 font-medium text-onwine transition-colors hover:bg-wine-deep disabled:opacity-50"
      >
        {submitting ? t("common", "loading") : t("newLoan", "submit")}
      </button>
    </form>
  );
}
