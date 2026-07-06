import { describe, expect, it } from "vitest";
import {
  calculateInterestPaise,
  computePeriodInterestPaise,
  monthsForPeriod,
  interestForMonths,
  type RateSegment,
} from "../interest";
import { computeLoan } from "../loanCalc";

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));

describe("monthsForPeriod — full_month (default: floor, min 1)", () => {
  it("charges a minimum of 1 month for a zero-day period", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 1, 1))).toBe(1);
  });
  it("30 days => 1 month", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 1, 31))).toBe(1);
  });
  it("35 days => 1 month (no extra month added)", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 2, 5))).toBe(1); // 35 days
  });
  it("60 days => 2 months", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 3, 2))).toBe(2);
  });
  it("70 days => 2 months (floor, not 3)", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 3, 12))).toBe(2);
  });
});

describe("monthsForPeriod — half_month (extra ≤15 days → +0.5)", () => {
  it("35 days => 1.5 months", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 2, 5), "half_month")).toBe(1.5);
  });
  it("46 days => 2 months (extra 16 > 15)", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 2, 16), "half_month")).toBe(2);
  });
  it("15 days => 1 month (minimum)", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 1, 16), "half_month")).toBe(1);
  });
});

describe("monthsForPeriod — exact_days (days / 30)", () => {
  it("35 days => 35/30 months", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 2, 5), "exact_days")).toBeCloseTo(35 / 30, 6);
  });
  it("15 days => 0.5 months", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 1, 16), "exact_days")).toBeCloseTo(0.5, 6);
  });
});

describe("computePeriodInterestPaise", () => {
  it("full_month: 35 days => 1 month", () => {
    expect(computePeriodInterestPaise(100_000, 10, d(2023, 1, 1), d(2023, 2, 5))).toBe(10_000);
  });
  it("half_month: 35 days => 1.5 months", () => {
    expect(computePeriodInterestPaise(100_000, 10, d(2023, 1, 1), d(2023, 2, 5), "half_month")).toBe(15_000);
  });
  it("exact_days: 15 days => 0.5 months", () => {
    expect(computePeriodInterestPaise(100_000, 10, d(2023, 1, 1), d(2023, 1, 16), "exact_days")).toBe(5_000);
  });
  it("rejects an end date before the start date", () => {
    expect(() => computePeriodInterestPaise(100_000, 10, d(2023, 2, 1), d(2023, 1, 1))).toThrow();
  });
});

describe("interestForMonths (manual override)", () => {
  it("supports fractional months", () => {
    expect(interestForMonths(100_000, 12, 2.5)).toBe(30_000);
  });
});

describe("calculateInterestPaise", () => {
  it("sums full_month across a rate change", () => {
    const principalPaise = 700_000; // ₹7000
    const segments: RateSegment[] = [
      { ratePercent: 12, effectiveFrom: d(2023, 1, 1), effectiveTo: d(2023, 2, 28) },
      { ratePercent: 15, effectiveFrom: d(2023, 3, 1), effectiveTo: null },
    ];
    // Segment 1: 58 days -> floor = 1 month -> 700000*0.12*1 = 84000
    // Segment 2: 19 days -> min 1 month     -> 700000*0.15*1 = 105000
    expect(calculateInterestPaise(principalPaise, segments, d(2023, 3, 20))).toBe(189_000);
  });

  it("ignores segments that start after asOfDate", () => {
    const principalPaise = 100_000;
    const segments: RateSegment[] = [
      { ratePercent: 12, effectiveFrom: d(2023, 1, 1), effectiveTo: null },
      { ratePercent: 20, effectiveFrom: d(2099, 1, 1), effectiveTo: null },
    ];
    expect(calculateInterestPaise(principalPaise, segments, d(2023, 1, 31))).toBe(
      computePeriodInterestPaise(principalPaise, 12, d(2023, 1, 1), d(2023, 1, 31))
    );
  });

  it("charges the 1-month minimum for a brand-new loan (as-of == loan date)", () => {
    const principalPaise = 700_000;
    const segments: RateSegment[] = [{ ratePercent: 12, effectiveFrom: d(2023, 1, 1), effectiveTo: null }];
    expect(calculateInterestPaise(principalPaise, segments, d(2023, 1, 1))).toBe(84_000);
  });
});

describe("computeLoan — first month interest deduction", () => {
  it("hands over principal minus one month's interest when deducted", () => {
    const r = computeLoan({
      principalPaise: 500_000, // ₹5000
      ratePercent: 2,
      startDate: d(2026, 6, 1),
      endDate: d(2026, 6, 1),
      deductFirstMonthInterest: true,
    });
    expect(r.monthlyInterestPaise).toBe(10_000); // ₹100
    expect(r.firstMonthInterestPaise).toBe(10_000);
    expect(r.amountGivenPaise).toBe(490_000); // ₹4900 handed over
  });

  it("hands over the full principal when not deducted", () => {
    const r = computeLoan({
      principalPaise: 500_000,
      ratePercent: 2,
      startDate: d(2026, 6, 1),
      endDate: d(2026, 6, 1),
      deductFirstMonthInterest: false,
    });
    expect(r.firstMonthInterestPaise).toBe(0);
    expect(r.amountGivenPaise).toBe(500_000);
  });

  it("credits the deducted first month at closing (no double charge)", () => {
    // One month later, full_month => 1 month total interest; first month already paid.
    const r = computeLoan({
      principalPaise: 500_000,
      ratePercent: 2,
      startDate: d(2026, 6, 1),
      endDate: d(2026, 7, 1), // 30 days -> 1 month
      deductFirstMonthInterest: true,
    });
    expect(r.totalInterestPaise).toBe(10_000);
    expect(r.balanceInterestPaise).toBe(0);
    expect(r.finalSettlementPaise).toBe(500_000);
  });
});
