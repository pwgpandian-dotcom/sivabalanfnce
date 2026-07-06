"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { computeLoan } from "@/lib/loanCalc";
import { type InterestMode } from "@/lib/interest";
import { formatPaise, rupeesToPaise, toDateInputValue } from "@/lib/money";

export type CalcUseValues = {
  principal: string;
  rate: string;
  loanDate: string;
  mode: InterestMode;
  deductFirstMonth: boolean;
};

function parseUTCDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Self-contained loan calculator. Used both on the standalone /calculator page
 * and embedded inside the New Loan form. When `onUse` is provided a
 * "Use This Calculation" button appears that hands the inputs back to the form.
 */
export function LoanCalculator({
  onUse,
  initial,
}: {
  onUse?: (v: CalcUseValues) => void;
  initial?: Partial<CalcUseValues>;
}) {
  const { t } = useLocale();
  const today = toDateInputValue(new Date());

  const [principal, setPrincipal] = useState(initial?.principal ?? "");
  const [rate, setRate] = useState(initial?.rate ?? "");
  const [loanDate, setLoanDate] = useState(initial?.loanDate ?? today);
  const [closingDate, setClosingDate] = useState(today);
  const [mode, setMode] = useState<InterestMode>(initial?.mode ?? "full_month");
  const [deductFirstMonth, setDeductFirstMonth] = useState(initial?.deductFirstMonth ?? false);

  const result = useMemo(() => {
    const principalNum = parseFloat(principal);
    const rateNum = parseFloat(rate);
    const start = parseUTCDate(loanDate);
    const end = parseUTCDate(closingDate);

    if (!principal || !rate || Number.isNaN(principalNum) || Number.isNaN(rateNum) || !start || !end) {
      return { state: "empty" as const };
    }
    if (end < start) return { state: "invalid" as const };

    const calc = computeLoan({
      principalPaise: rupeesToPaise(principalNum),
      ratePercent: rateNum,
      startDate: start,
      endDate: end,
      mode,
      deductFirstMonthInterest: deductFirstMonth,
    });
    const totalDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
    return { state: "ok" as const, calc, totalDays };
  }, [principal, rate, loanDate, closingDate, mode, deductFirstMonth]);

  const input =
    "rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono text-ink outline-none focus:border-wine";
  const modeBtn = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs ${active ? "bg-wine text-onwine" : "border border-gold-soft hover:bg-ivory-deep"}`;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* Inputs */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("loanCalc", "principal")}
            <input type="number" step="0.01" inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("loanCalc", "rate")}
            <input type="number" step="0.01" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("loanCalc", "loanDate")}
            <input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("loanCalc", "closingDate")}
            <input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} className={input} />
          </label>
        </div>

        <div className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("loanCalc", "mode")}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode("full_month")} className={modeBtn(mode === "full_month")}>{t("loanCalc", "modeFullMonth")}</button>
            <button type="button" onClick={() => setMode("half_month")} className={modeBtn(mode === "half_month")}>{t("loanCalc", "modeHalfMonth")}</button>
            <button type="button" onClick={() => setMode("exact_days")} className={modeBtn(mode === "exact_days")}>{t("loanCalc", "modeExactDays")}</button>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("loanCalc", "firstMonth")}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setDeductFirstMonth(true)} className={modeBtn(deductFirstMonth)}>{t("loanCalc", "deduct")}</button>
            <button type="button" onClick={() => setDeductFirstMonth(false)} className={modeBtn(!deductFirstMonth)}>{t("loanCalc", "noDeduct")}</button>
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="ledger-card ledger-rule flex flex-col justify-center rounded-2xl p-5">
        {result.state === "ok" ? (
          <div className="flex flex-col gap-2 text-sm">
            <Row label={t("loanCalc", "period")} value={`${result.totalDays} ${t("loanCalc", "days")} · ${result.calc.months.toFixed(2)} ${t("loanCalc", "months")}`} />
            <Row label={t("loanCalc", "monthlyInterest")} value={formatPaise(result.calc.monthlyInterestPaise)} />
            <Row label={t("loanCalc", "totalInterest")} value={formatPaise(result.calc.totalInterestPaise)} />
            {deductFirstMonth && (
              <>
                <Row label={t("loanCalc", "interestDeducted")} value={`− ${formatPaise(result.calc.firstMonthInterestPaise)}`} />
                <Row label={t("loanCalc", "amountGiven")} value={formatPaise(result.calc.amountGivenPaise)} strong />
              </>
            )}
            <div className="mt-1 rounded-xl bg-wine p-3 text-onwine">
              <div className="text-[10px] uppercase tracking-wide text-gold-soft">{t("loanCalc", "finalSettlement")}</div>
              <div className="font-mono text-2xl font-bold text-gold-bright">{formatPaise(result.calc.finalSettlementPaise)}</div>
            </div>
            {onUse && (
              <button
                type="button"
                onClick={() => onUse({ principal, rate, loanDate, mode, deductFirstMonth })}
                className="mt-2 self-start rounded-lg bg-gold px-4 py-2 text-sm font-medium text-wine-deep hover:bg-gold-bright"
              >
                {t("loanCalc", "useThis")}
              </button>
            )}
          </div>
        ) : result.state === "invalid" ? (
          <p className="text-center text-sm text-wine-soft">{t("loanCalc", "invalidDates")}</p>
        ) : (
          <p className="text-center text-sm text-ink-soft">{t("loanCalc", "enterValues")}</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gold-soft/50 pb-1 last:border-0">
      <span className="text-ink-soft">{label}</span>
      <span className={`font-mono ${strong ? "font-semibold text-wine" : "text-ink"}`}>{value}</span>
    </div>
  );
}
