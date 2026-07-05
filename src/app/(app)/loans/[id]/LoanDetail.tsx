"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise, rupeesToPaise, toDateInputValue } from "@/lib/money";
import { currentInterestOwed, currentRate } from "@/lib/loans";
import { RePledgeSection, type RePledge } from "./RePledgeSection";
import { EditLoanForm, type StaffLite, type LoanEdit } from "./EditLoanForm";

type RateSegment = {
  id: string;
  rate_percent: number;
  effective_from: string;
  effective_to: string | null;
};

type Payment = {
  id: string;
  payment_date: string;
  amount_paise: number;
  payment_type: "interest" | "partial_principal" | "full_closing";
  auto_calculated_interest_paise: number | null;
  manual_interest_override_paise: number | null;
  manual_principal_override_paise: number | null;
};

export type LoanDetailData = {
  id: string;
  loan_number: string;
  principal_paise: number;
  pledge_item_description: string;
  pledge_weight_grams: number | null;
  loan_date: string;
  status: "active" | "closed";
  closed_date: string | null;
  item_type: "gold" | "silver" | null;
  remarks: string | null;
  issued_by: string | null;
  received_by: string | null;
  customers: { id: string; name: string; phone: string | null; address: string | null };
  interest_rate_segments: RateSegment[];
  payments: Payment[];
  re_pledges: RePledge[];
};

export function LoanDetail({
  loan,
  staff,
  shopId,
  editHistory,
}: {
  loan: LoanDetailData;
  staff: StaffLite[];
  shopId: string;
  editHistory: LoanEdit[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isActive = loan.status === "active";
  const [editing, setEditing] = useState(false);

  const interestOwed = useMemo(
    () => currentInterestOwed(loan.principal_paise, loan.interest_rate_segments),
    [loan.principal_paise, loan.interest_rate_segments]
  );
  const rateNow = currentRate(loan.interest_rate_segments);
  const activeRePledge = loan.re_pledges.find((r) => r.status === "active") ?? null;
  const staffName = (id: string | null) => (id ? (staff.find((s) => s.userId === id)?.name ?? "—") : "—");

  return (
    <div className="flex flex-col gap-6">
      <div className="ledger-card rounded-2xl p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gold-soft pb-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-wine">{loan.customers.name}</h1>
            <p className="text-sm text-ink-soft">
              {loan.customers.phone} {loan.customers.address && `· ${loan.customers.address}`}
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-xl font-semibold text-gold">#{loan.loan_number}</div>
            <span
              className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${
                isActive ? "bg-wine text-onwine" : "bg-ivory-deep text-ink-soft"
              }`}
            >
              {t("loanStatus", loan.status)}
            </span>
            {activeRePledge && (
              <div className="mt-1">
                <span className="inline-block rounded-full border border-wine bg-wine/10 px-2.5 py-0.5 text-[11px] font-medium text-wine">
                  {t("rePledge", "withBroker")} {activeRePledge.larger_broker_name}
                </span>
              </div>
            )}
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setEditing((v) => !v)}
                className="inline-block rounded-lg border border-wine px-3 py-1 text-sm text-wine transition-colors hover:bg-wine hover:text-onwine"
              >
                {t("loanDetail", "editLoan")}
              </button>
              <Link
                href={`/receipt/${loan.id}`}
                className="inline-block rounded-lg border border-wine px-3 py-1 text-sm text-wine transition-colors hover:bg-wine hover:text-onwine"
              >
                {t("loanDetail", "printReceipt")}
              </Link>
            </div>
          </div>
        </div>

        {editing && (
          <div className="pt-5">
            <EditLoanForm
              shopId={shopId}
              onCancel={() => setEditing(false)}
              loan={{
                id: loan.id,
                customerId: loan.customers.id,
                customerName: loan.customers.name,
                customerPhone: loan.customers.phone,
                customerAddress: loan.customers.address,
                principalPaise: loan.principal_paise,
                pledgeItem: loan.pledge_item_description,
                pledgeWeightGrams: loan.pledge_weight_grams,
                itemType: loan.item_type ?? "gold",
                loanDate: loan.loan_date,
                remarks: loan.remarks,
                ratePercent: rateNow,
                issuedBy: loan.issued_by,
                receivedBy: loan.received_by,
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 border-b border-gold-soft py-5 sm:grid-cols-4">
          <Field label={t("loanDetail", "loanDate")} value={loan.loan_date} mono />
          <Field label={t("newLoan", "principal")} value={formatPaise(loan.principal_paise)} mono />
          <Field label={t("loanDetail", "currentRate")} value={rateNow !== null ? `${rateNow}%` : "—"} mono />
          <Field label={t("dashboard", "interestOwed")} value={formatPaise(interestOwed)} mono highlight />
        </div>

        <div className="grid grid-cols-2 gap-6 border-b border-gold-soft py-5 sm:grid-cols-4">
          <Field label={t("loanDetail", "itemTypeLabel")} value={t("newLoan", loan.item_type ?? "gold")} />
          <Field label={t("loanDetail", "issuedByLabel")} value={staffName(loan.issued_by)} />
          <Field label={t("loanDetail", "receivedByLabel")} value={staffName(loan.received_by)} />
        </div>

        <div className="py-5">
          <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
            {t("loanDetail", "pledgeDetails")}
          </h2>
          <p>
            {loan.pledge_item_description}
            {loan.pledge_weight_grams != null && (
              <span className="font-mono text-ink-soft"> — {loan.pledge_weight_grams}{t("loanDetail", "weightGrams")}</span>
            )}
          </p>
          {loan.remarks && (
            <p className="mt-2 text-sm text-ink-soft">
              <span className="font-medium">{t("loanDetail", "remarksLabel")}:</span> {loan.remarks}
            </p>
          )}
        </div>
      </div>

      <RateHistory
        segments={loan.interest_rate_segments}
        loanId={loan.id}
        isActive={isActive}
        supabase={supabase}
        onChanged={() => router.refresh()}
      />

      <PaymentsSection
        loan={loan}
        interestOwed={interestOwed}
        supabase={supabase}
        onChanged={() => router.refresh()}
      />

      <RePledgeSection loanId={loan.id} loanNumber={loan.loan_number} rePledges={loan.re_pledges} />

      {editHistory.length > 0 && (
        <div className="ledger-card rounded-2xl p-8">
          <h2 className="mb-3 font-serif text-lg font-semibold text-wine">{t("loanDetail", "editHistory")}</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {editHistory.map((h) => {
              const p = h.previous;
              const prevPrincipal = typeof p.principal_paise === "number" ? formatPaise(p.principal_paise) : "—";
              return (
                <li key={h.id} className="border-b border-gold-soft/50 pb-2 last:border-0">
                  <div className="text-ink-soft">
                    {t("loanDetail", "editedOn")} {new Date(h.edited_at).toLocaleString()}
                  </div>
                  <div className="font-mono text-xs text-ink-soft">
                    {`${prevPrincipal} · ${p.rate_percent ?? "—"}% · ${p.item_type ?? "—"} · ${p.loan_date ?? "—"}`}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isActive && (
        <CloseLoanPanel
          loanId={loan.id}
          interestOwed={interestOwed}
          principalPaise={loan.principal_paise}
          supabase={supabase}
          onClosed={() => router.refresh()}
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-soft">{label}</div>
      <div className={`${mono ? "font-mono" : ""} ${highlight ? "font-semibold text-wine" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function RateHistory({
  segments,
  loanId,
  isActive,
  supabase,
  onChanged,
}: {
  segments: RateSegment[];
  loanId: string;
  isActive: boolean;
  supabase: ReturnType<typeof createClient>;
  onChanged: () => void;
}) {
  const { t } = useLocale();
  const [showForm, setShowForm] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(toDateInputValue(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("change_interest_rate", {
      p_loan_id: loanId,
      p_new_rate_percent: parseFloat(newRate),
      p_effective_from: effectiveFrom,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setShowForm(false);
    setNewRate("");
    onChanged();
  }

  return (
    <div className="ledger-card ledger-rule rounded-2xl p-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-wine">{t("loanDetail", "rateHistory")}</h2>
        {isActive && !showForm && (
          <button onClick={() => setShowForm(true)} className="text-sm text-wine hover:underline">
            {t("loanDetail", "changeRate")}
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {segments.length === 0 && <li className="text-ink-soft">{t("loanDetail", "noSegments")}</li>}
        {segments.map((s) => (
          <li key={s.id} className="flex justify-between font-mono text-sm">
            <span>
              {s.effective_from} {"→"} {s.effective_to ?? "…"}
            </span>
            <span className="font-semibold text-gold">{s.rate_percent}%</span>
          </li>
        ))}
      </ul>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3 border-t border-gold-soft pt-4">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("loanDetail", "newRate")}
            <input
              type="number"
              step="0.01"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              required
              className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono outline-none focus:border-wine"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("loanDetail", "effectiveFrom")}
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              required
              className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono outline-none focus:border-wine"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-wine px-4 py-2 text-sm font-medium text-onwine hover:bg-wine-deep disabled:opacity-50"
          >
            {t("common", "save")}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="text-sm text-ink-soft hover:underline">
            {t("common", "cancel")}
          </button>
          {error && <p className="w-full text-sm text-wine-soft">{error}</p>}
        </form>
      )}
    </div>
  );
}

function PaymentsSection({
  loan,
  interestOwed,
  supabase,
  onChanged,
}: {
  loan: LoanDetailData;
  interestOwed: number;
  supabase: ReturnType<typeof createClient>;
  onChanged: () => void;
}) {
  const { t } = useLocale();
  const isActive = loan.status === "active";
  const [showForm, setShowForm] = useState(false);
  const [paymentType, setPaymentType] = useState<Payment["payment_type"]>("interest");
  const [paymentDate, setPaymentDate] = useState(toDateInputValue(new Date()));
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayAmount =
    paymentType === "interest" && autoCalculate ? (interestOwed / 100).toFixed(2) : amount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const amountPaise =
      paymentType === "interest" && autoCalculate ? interestOwed : rupeesToPaise(parseFloat(amount));

    const manualInterestOverride =
      paymentType === "interest" && !autoCalculate ? amountPaise : null;

    const { error: rpcError } = await supabase.rpc("record_payment", {
      p_loan_id: loan.id,
      p_payment_date: paymentDate,
      p_amount_paise: amountPaise,
      p_payment_type: paymentType,
      p_manual_interest_override_paise: manualInterestOverride,
      p_manual_principal_override_paise: null,
    });

    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setShowForm(false);
    setAmount("");
    onChanged();
  }

  return (
    <div className="ledger-card rounded-2xl p-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-wine">{t("loanDetail", "payments")}</h2>
        {isActive && !showForm && (
          <button onClick={() => setShowForm(true)} className="text-sm text-wine hover:underline">
            {t("loanDetail", "recordPayment")}
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {loan.payments.length === 0 && <li className="text-ink-soft">{t("loanDetail", "noPayments")}</li>}
        {loan.payments.map((p) => (
          <li key={p.id} className="flex justify-between font-mono text-sm">
            <span>
              {p.payment_date} — {t("paymentType", p.payment_type)}
            </span>
            <span className="font-semibold text-wine">{formatPaise(p.amount_paise)}</span>
          </li>
        ))}
      </ul>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 border-t border-gold-soft pt-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("loanDetail", "paymentTypeLabel")}
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as Payment["payment_type"])}
                className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 outline-none focus:border-wine"
              >
                <option value="interest">{t("paymentType", "interest")}</option>
                <option value="partial_principal">{t("paymentType", "partial_principal")}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("loanDetail", "paymentDate")}
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono outline-none focus:border-wine"
              />
            </label>
          </div>

          {paymentType === "interest" && (
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => setAutoCalculate(true)}
                className={`rounded-full px-3 py-1 ${autoCalculate ? "bg-wine text-onwine" : "border border-gold-soft"}`}
              >
                {t("loanDetail", "autoCalculate")}
              </button>
              <button
                type="button"
                onClick={() => setAutoCalculate(false)}
                className={`rounded-full px-3 py-1 ${!autoCalculate ? "bg-wine text-onwine" : "border border-gold-soft"}`}
              >
                {t("loanDetail", "enterManually")}
              </button>
              {autoCalculate && (
                <span className="font-mono text-ink-soft">
                  {t("loanDetail", "calculatedInterest")}: {formatPaise(interestOwed)}
                </span>
              )}
            </div>
          )}

          <label className="flex max-w-xs flex-col gap-1 text-sm text-ink-soft">
            {t("loanDetail", "amount")}
            <input
              type="number"
              step="0.01"
              value={displayAmount}
              onChange={(e) => setAmount(e.target.value)}
              readOnly={paymentType === "interest" && autoCalculate}
              required
              className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono outline-none focus:border-wine read-only:bg-ivory-deep"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-wine px-4 py-2 text-sm font-medium text-onwine hover:bg-wine-deep disabled:opacity-50"
            >
              {t("common", "save")}
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

function CloseLoanPanel({
  loanId,
  interestOwed,
  principalPaise,
  supabase,
  onClosed,
}: {
  loanId: string;
  interestOwed: number;
  principalPaise: number;
  supabase: ReturnType<typeof createClient>;
  onClosed: () => void;
}) {
  const { t } = useLocale();
  const [confirming, setConfirming] = useState(false);
  const [closedDate, setClosedDate] = useState(toDateInputValue(new Date()));
  const [finalAmount, setFinalAmount] = useState(((principalPaise + interestOwed) / 100).toFixed(2));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("close_loan", {
      p_loan_id: loanId,
      p_closed_date: closedDate,
      p_final_payment_amount_paise: rupeesToPaise(parseFloat(finalAmount)),
      p_manual_interest_override_paise: null,
      p_manual_principal_override_paise: null,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onClosed();
  }

  return (
    <div className="ledger-card rounded-2xl border-2 border-wine p-6">
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-lg bg-wine px-5 py-2 font-medium text-onwine hover:bg-wine-deep"
        >
          {t("loanDetail", "closeLoan")}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-soft">{t("loanDetail", "closeLoanConfirm")}</p>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("loanDetail", "finalAmount")}
              <input
                type="number"
                step="0.01"
                value={finalAmount}
                onChange={(e) => setFinalAmount(e.target.value)}
                className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono outline-none focus:border-wine"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("loanDetail", "closedDate")}
              <input
                type="date"
                value={closedDate}
                onChange={(e) => setClosedDate(e.target.value)}
                className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono outline-none focus:border-wine"
              />
            </label>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="rounded-lg bg-wine px-5 py-2 font-medium text-onwine hover:bg-wine-deep disabled:opacity-50"
            >
              {t("loanDetail", "closeLoan")}
            </button>
            <button onClick={() => setConfirming(false)} className="text-sm text-ink-soft hover:underline">
              {t("common", "cancel")}
            </button>
          </div>
          {error && <p className="text-sm text-wine-soft">{error}</p>}
        </div>
      )}
    </div>
  );
}
