"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { computePeriodInterestPaise } from "@/lib/interest";
import { formatPaise, rupeesToPaise, toDateInputValue } from "@/lib/money";

function parseUTCDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function CalculatorForm() {
  const { t } = useLocale();
  const today = toDateInputValue(new Date());

  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [asOfDate, setAsOfDate] = useState(today);

  const result = useMemo(() => {
    const principalNum = parseFloat(principal);
    const rateNum = parseFloat(rate);
    const start = parseUTCDate(startDate);
    const asOf = parseUTCDate(asOfDate);

    if (
      !principal ||
      !rate ||
      Number.isNaN(principalNum) ||
      Number.isNaN(rateNum) ||
      !start ||
      !asOf
    ) {
      return { state: "empty" as const };
    }

    if (asOf < start) return { state: "invalid" as const };

    const principalPaise = rupeesToPaise(principalNum);
    const interestPaise = computePeriodInterestPaise(principalPaise, rateNum, start, asOf);
    const totalDays = Math.round((asOf.getTime() - start.getTime()) / MS_PER_DAY);
    const fullMonths = Math.floor(totalDays / 30);
    const extraDays = totalDays - fullMonths * 30;
    const units = extraDays === 0 ? fullMonths : extraDays <= 10 ? fullMonths + 0.5 : fullMonths + 1;

    return {
      state: "ok" as const,
      principalPaise,
      interestPaise,
      totalPaise: principalPaise + interestPaise,
      totalDays,
      units,
    };
  }, [principal, rate, startDate, asOfDate]);

  const inputClass =
    "rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono text-ink outline-none focus:border-wine";

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Inputs */}
      <div className="ledger-card flex flex-col gap-4 rounded-2xl p-6">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("calculator", "principal")}
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {t("calculator", "rate")}
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className={inputClass}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("calculator", "startDate")}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("calculator", "asOfDate")}
            <div className="flex gap-2">
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className={`${inputClass} w-full`}
              />
              <button
                type="button"
                onClick={() => setAsOfDate(today)}
                className="whitespace-nowrap rounded-lg border border-gold-soft px-2 text-xs text-wine hover:bg-ivory-deep"
              >
                {t("calculator", "today")}
              </button>
            </div>
          </label>
        </div>
      </div>

      {/* Output */}
      <div className="ledger-card ledger-rule flex flex-col justify-center rounded-2xl p-6">
        {result.state === "ok" ? (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-soft">{t("calculator", "period")}</div>
              <div className="font-mono text-lg text-ink">
                {result.totalDays} {t("calculator", "days")}
                <span className="ml-2 text-sm text-ink-soft">
                  ({result.units} {t("calculator", "months")})
                </span>
              </div>
            </div>
            <div className="border-t border-gold-soft pt-3">
              <div className="text-xs uppercase tracking-wide text-ink-soft">{t("calculator", "interest")}</div>
              <div className="font-mono text-2xl font-semibold text-wine">
                {formatPaise(result.interestPaise)}
              </div>
            </div>
            <div className="rounded-xl bg-wine p-4 text-onwine">
              <div className="text-xs uppercase tracking-wide text-gold-soft">{t("calculator", "total")}</div>
              <div className="font-mono text-3xl font-bold text-gold-bright">
                {formatPaise(result.totalPaise)}
              </div>
            </div>
          </div>
        ) : result.state === "invalid" ? (
          <p className="text-center text-sm text-wine-soft">{t("calculator", "invalidDates")}</p>
        ) : (
          <p className="text-center text-sm text-ink-soft">{t("calculator", "enterValues")}</p>
        )}
      </div>
    </div>
  );
}
