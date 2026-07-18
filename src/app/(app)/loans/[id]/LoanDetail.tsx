"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise, rupeesToPaise, toDateInputValue } from "@/lib/money";
import { currentInterestOwed, currentRate } from "@/lib/loans";
import { monthsForPeriod, interestForMonths, type InterestMode } from "@/lib/interest";
import { RePledgeSection, type RePledge, type RePledgeHistory } from "./RePledgeSection";
import { EditLoanForm, type LoanEdit } from "./EditLoanForm";

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
  item_count: number | null;
  remarks: string | null;
  issued_by: string | null;
  received_by: string | null;
  interest_mode: InterestMode | null;
  first_month_interest_deducted: boolean | null;
  first_month_interest_paise: number | null;
  customers: { id: string; name: string; phone: string | null; address: string | null };
  interest_rate_segments: RateSegment[];
  payments: Payment[];
  re_pledges: RePledge[];
};

export function LoanDetail({
  loan,
  shopId,
  editHistory,
  rePledgeHistory,
}: {
  loan: LoanDetailData;
  shopId: string;
  editHistory: LoanEdit[];
  rePledgeHistory: RePledgeHistory[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isActive = loan.status === "active";
  const searchParams = useSearchParams();
  // Open the edit form directly when arriving via the "Edit" action (?edit=1).
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(t("loanDetail", "deleteLoanConfirm"))) return;
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.from("loans").delete().eq("id", loan.id);
    if (error) {
      setDeleting(false);
      setDeleteError(error.message);
      return;
    }
    router.push("/loans/active");
    router.refresh();
  }

  const mode: InterestMode = loan.interest_mode ?? "full_month";
  const interestOwed = useMemo(
    () => currentInterestOwed(loan.principal_paise, loan.interest_rate_segments, mode),
    [loan.principal_paise, loan.interest_rate_segments, mode]
  );
  const rateNow = currentRate(loan.interest_rate_segments);
  const activeRePledge = loan.re_pledges.find((r) => r.status === "active") ?? null;

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
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-block rounded-lg border border-wine-soft px-3 py-1 text-sm text-wine-soft transition-colors hover:bg-wine-soft hover:text-onwine disabled:opacity-50"
              >
                {deleting ? t("common", "loading") : t("loanDetail", "deleteLoan")}
              </button>
            </div>
            {deleteError && <p className="mt-1 text-right text-xs text-wine-soft">{deleteError}</p>}
          </div>
        </div>

        {editing && (
          <div className="pt-5">
            <EditLoanForm
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
                itemCount: loan.item_count ?? 1,
                loanDate: loan.loan_date,
                remarks: loan.remarks,
                ratePercent: rateNow,
                issuedBy: loan.issued_by,
                receivedBy: loan.received_by,
                interestMode: mode,
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 border-b border-gold-soft py-5 sm:grid-cols-4">
          <Field label={t("loanDetail", "loanDate")} value={loan.loan_date} mono />
          <Field label={t("loanDetail", "principalAmount")} value={formatPaise(loan.principal_paise)} mono />
          <Field label={t("loanDetail", "currentRate")} value={rateNow !== null ? `${rateNow}%` : "—"} mono />
          <Field label={t("dashboard", "interestDue")} value={formatPaise(interestOwed)} mono highlight />
        </div>

        <div className="grid grid-cols-2 gap-6 border-b border-gold-soft py-5 sm:grid-cols-4">
          <Field label={t("loanDetail", "itemTypeLabel")} value={t("newLoan", loan.item_type ?? "gold")} />
          <Field label={t("loanDetail", "itemCountLabel")} value={`${loan.item_count ?? 1} ${t("newLoan", "itemsUnit")}`} mono />
          <Field label={t("loanDetail", "issuedByLabel")} value={loan.issued_by || "—"} />
          <Field label={t("loanDetail", "receivedByLabel")} value={loan.received_by || "—"} />
          <Field label={t("loanDetail", "interestModeLabel")} value={t("loanDetail", mode === "half_month" ? "halfMonth" : mode === "exact_days" ? "exactDays" : "fullMonth")} />
        </div>

        {loan.first_month_interest_deducted && (
          <div className="border-b border-gold-soft py-5">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
              {t("loanDetail", "disbursementTitle")}
            </h2>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              <Field label={t("loanDetail", "principalAmount")} value={formatPaise(loan.principal_paise)} mono />
              <Field
                label={t("loanDetail", "firstMonthDeductedLabel")}
                value={`− ${formatPaise(loan.first_month_interest_paise ?? 0)}`}
                mono
              />
              <Field
                label={t("loanDetail", "cashDisbursed")}
                value={formatPaise(loan.principal_paise - (loan.first_month_interest_paise ?? 0))}
                mono
                highlight
              />
            </div>
          </div>
        )}

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

      <RePledgeSection
        loanId={loan.id}
        loanNumber={loan.loan_number}
        loanActive={isActive}
        shopId={shopId}
        loanInfo={{
          customerName: loan.customers.name,
          customerPhone: loan.customers.phone,
          itemType: loan.item_type,
          pledgeItem: loan.pledge_item_description,
          weightGrams: loan.pledge_weight_grams,
          principalPaise: loan.principal_paise,
        }}
        rePledges={loan.re_pledges}
        histories={rePledgeHistory}
      />

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
          loanDate={loan.loan_date}
          principalPaise={loan.principal_paise}
          segments={loan.interest_rate_segments}
          paidInterestPaise={loan.payments
            .filter((p) => p.payment_type === "interest")
            .reduce((s, p) => s + p.amount_paise, 0)}
          initialMode={mode}
          firstMonthDeducted={loan.first_month_interest_deducted ?? false}
          firstMonthInterestPaise={loan.first_month_interest_paise ?? 0}
          blockedByRePledge={activeRePledge != null}
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

  // The first month's interest deducted at issuance is stored as an `interest`
  // payment dated the loan date. Surface it as a disbursement deduction rather
  // than a normal customer payment, so payment history shows only real payments.
  const issuanceDeduction = loan.first_month_interest_deducted
    ? loan.payments.find((p) => p.payment_type === "interest" && p.payment_date === loan.loan_date)
    : undefined;
  const customerPayments = issuanceDeduction
    ? loan.payments.filter((p) => p.id !== issuanceDeduction.id)
    : loan.payments;

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

      {issuanceDeduction && (
        <div className="mb-3 flex justify-between border-b border-gold-soft pb-3 font-mono text-sm text-ink-soft">
          <span>
            {issuanceDeduction.payment_date} — {t("loanDetail", "interestDeductedAtIssue")}
          </span>
          <span className="font-semibold">− {formatPaise(issuanceDeduction.amount_paise)}</span>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {customerPayments.length === 0 && <li className="text-ink-soft">{t("loanDetail", "noPayments")}</li>}
        {customerPayments.map((p) => (
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

const parseUTC = (s: string) => new Date(s + "T00:00:00Z");

function CloseLoanPanel({
  loanId,
  loanDate,
  principalPaise,
  segments,
  paidInterestPaise,
  initialMode,
  firstMonthDeducted,
  firstMonthInterestPaise,
  blockedByRePledge,
  supabase,
  onClosed,
}: {
  loanId: string;
  loanDate: string;
  principalPaise: number;
  segments: RateSegment[];
  paidInterestPaise: number;
  initialMode: InterestMode;
  firstMonthDeducted: boolean;
  firstMonthInterestPaise: number;
  blockedByRePledge: boolean;
  supabase: ReturnType<typeof createClient>;
  onClosed: () => void;
}) {
  const { t } = useLocale();
  const [confirming, setConfirming] = useState(false);
  const [closedDate, setClosedDate] = useState(toDateInputValue(new Date()));
  const [mode, setMode] = useState<InterestMode>(initialMode);
  const [monthsOverride, setMonthsOverride] = useState<string>(""); // "" = auto (from mode)
  const [finalEdited, setFinalEdited] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openSeg = segments.find((s) => s.effective_to === null) ?? segments[segments.length - 1];
  const currentRate = openSeg?.rate_percent ?? 0;

  // Everything below recomputes live from the chosen closed date + interest mode.
  // Total elapsed months are measured from the LOAN DATE (not the latest rate
  // segment) so the figure the operator sees is the whole term of the loan.
  const asOf = parseUTC(closedDate);
  const loanStart = parseUTC(loanDate);
  const autoMonths = asOf >= loanStart ? monthsForPeriod(loanStart, asOf, mode) : 0;

  const months = monthsOverride !== "" && !Number.isNaN(parseFloat(monthsOverride)) ? parseFloat(monthsOverride) : autoMonths;

  // Settlement is driven entirely by the displayed months so the four figures
  // (elapsed months, calc months, balance interest, final settlement) always
  // agree: interest = months × monthly interest, at the current rate. If the
  // rate changed mid-term, adjust the months or final amount fields as needed.
  const monthlyInterest = interestForMonths(principalPaise, currentRate, 1);
  const originalInterest = interestForMonths(principalPaise, currentRate, months);
  // Credits: the first month deducted at issuance plus any interest paid since.
  // Both are recorded as `interest` payments, so paidInterestPaise already sums
  // them; split it out only for display.
  const firstMonthCredit = firstMonthDeducted ? firstMonthInterestPaise : 0;
  const otherInterestPaid = Math.max(0, paidInterestPaise - firstMonthCredit);
  const balanceInterest = Math.max(0, originalInterest - paidInterestPaise);
  const settlementPaise = principalPaise + balanceInterest;
  const finalAmount = finalEdited ?? (settlementPaise / 100).toFixed(2);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("close_loan", {
      p_loan_id: loanId,
      p_closed_date: closedDate,
      p_final_payment_amount_paise: rupeesToPaise(parseFloat(finalAmount)),
      p_manual_interest_override_paise: balanceInterest,
      p_manual_principal_override_paise: null,
      p_interest_mode: mode,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onClosed();
  }

  const modeBtn = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs ${active ? "bg-wine text-onwine" : "border border-gold-soft hover:bg-ivory-deep"}`;

  if (blockedByRePledge) {
    return (
      <div className="ledger-card rounded-2xl border border-gold-soft p-6 text-sm text-ink-soft">
        {t("loanDetail", "closeBlockedRePledge")}
      </div>
    );
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
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">{t("loanDetail", "closeLoanConfirm")}</p>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("loanDetail", "closedDate")}
              <input
                type="date"
                value={closedDate}
                onChange={(e) => {
                  setClosedDate(e.target.value);
                  setMonthsOverride("");
                  setFinalEdited(null);
                }}
                className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono outline-none focus:border-wine"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {t("loanDetail", "monthsUnit")}
              <input
                type="number"
                step="0.5"
                value={monthsOverride !== "" ? monthsOverride : String(autoMonths)}
                onChange={(e) => {
                  setMonthsOverride(e.target.value);
                  setFinalEdited(null);
                }}
                className="w-24 rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono outline-none focus:border-wine"
              />
            </label>
            <span className="pb-2 font-mono text-xs text-ink-soft">
              {t("loanDetail", "calcMonths")}: {autoMonths} {t("loanDetail", "monthsUnit")}
            </span>
          </div>

          {/* Interest mode — drives the calculation (req 3). */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setMode("full_month"); setMonthsOverride(""); setFinalEdited(null); }} className={modeBtn(mode === "full_month")}>
              {t("loanDetail", "fullMonth")}
            </button>
            <button type="button" onClick={() => { setMode("half_month"); setMonthsOverride(""); setFinalEdited(null); }} className={modeBtn(mode === "half_month")}>
              {t("loanDetail", "halfMonth")}
            </button>
            <button type="button" onClick={() => { setMode("exact_days"); setMonthsOverride(""); setFinalEdited(null); }} className={modeBtn(mode === "exact_days")}>
              {t("loanDetail", "exactDays")}
            </button>
          </div>

          {/* Settlement breakdown — every figure is derived from `months`, so the
              displayed months, interest and settlement always agree (req 8). */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl border border-gold-soft bg-ivory-deep/40 p-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
            <Field label={t("loanDetail", "principalAmount")} value={formatPaise(principalPaise)} mono />
            <Field label={t("loanDetail", "elapsedMonths")} value={`${months} ${t("loanDetail", "monthsUnit")}`} mono />
            <Field label={t("loanDetail", "monthlyInterest")} value={formatPaise(monthlyInterest)} mono />
            <Field label={t("loanDetail", "originalInterest")} value={formatPaise(originalInterest)} mono />
            {firstMonthDeducted && (
              <Field label={t("loanDetail", "firstMonthDeductedLabel")} value={`− ${formatPaise(firstMonthCredit)}`} mono />
            )}
            <Field label={t("loanDetail", "paidInterest")} value={`− ${formatPaise(otherInterestPaid)}`} mono />
            <Field label={t("loanDetail", "balanceInterest")} value={formatPaise(balanceInterest)} mono />
            <Field label={t("loanDetail", "finalSettlement")} value={formatPaise(settlementPaise)} mono highlight />
          </div>

          <label className="flex max-w-xs flex-col gap-1 text-sm text-ink-soft">
            {t("loanDetail", "finalAmount")}
            <input
              type="number"
              step="0.01"
              value={finalAmount}
              onChange={(e) => setFinalEdited(e.target.value)}
              className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono outline-none focus:border-wine"
            />
          </label>

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
