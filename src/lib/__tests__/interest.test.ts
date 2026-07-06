import { describe, expect, it } from "vitest";
import {
  calculateInterestPaise,
  computePeriodInterestPaise,
  monthsForPeriod,
  interestForMonths,
  type RateSegment,
} from "../interest";

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));

describe("monthsForPeriod (round-up, min 1)", () => {
  it("charges a minimum of 1 month for a zero-day period", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 1, 1))).toBe(1);
  });
  it("charges 1 month for 1–30 days", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 1, 31))).toBe(1); // 30 days
  });
  it("rounds 31 days up to 2 months", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 2, 1))).toBe(2); // 31 days
  });
  it("charges 2 months for exactly 60 days", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 3, 2))).toBe(2); // 60 days
  });
  it("rounds '2 months 10 days' (70 days) up to 3 months", () => {
    expect(monthsForPeriod(d(2023, 1, 1), d(2023, 3, 12))).toBe(3); // 70 days
  });
});

describe("computePeriodInterestPaise", () => {
  it("uses round-up months (0 days => 1 month)", () => {
    expect(computePeriodInterestPaise(100_000, 10, d(2023, 1, 1), d(2023, 1, 1))).toBe(10_000);
  });
  it("31 days => 2 months", () => {
    expect(computePeriodInterestPaise(100_000, 10, d(2023, 1, 1), d(2023, 2, 1))).toBe(20_000);
  });
  it("70 days => 3 months", () => {
    expect(computePeriodInterestPaise(100_000, 10, d(2023, 1, 1), d(2023, 3, 12))).toBe(30_000);
  });
  it("rejects an end date before the start date", () => {
    expect(() => computePeriodInterestPaise(100_000, 10, d(2023, 2, 1), d(2023, 1, 1))).toThrow();
  });
});

describe("interestForMonths (manual override)", () => {
  it("supports fractional months", () => {
    expect(interestForMonths(100_000, 12, 2.5)).toBe(30_000); // 100000*0.12*2.5
  });
});

describe("calculateInterestPaise", () => {
  it("sums round-up months across a rate change", () => {
    const principalPaise = 700_000; // ₹7000
    const segments: RateSegment[] = [
      { ratePercent: 12, effectiveFrom: d(2022, 11, 27), effectiveTo: d(2023, 2, 28) },
      { ratePercent: 15, effectiveFrom: d(2023, 3, 1), effectiveTo: null },
    ];
    // Segment 1: 93 days -> ceil = 4 months -> 700000*0.12*4 = 336000
    // Segment 2: 19 days -> 1 month       -> 700000*0.15*1 = 105000
    expect(calculateInterestPaise(principalPaise, segments, d(2023, 3, 20))).toBe(441_000);
  });

  it("sums correctly across 3+ rate changes (each ~1 month)", () => {
    const principalPaise = 100_000;
    const segments: RateSegment[] = [
      { ratePercent: 12, effectiveFrom: d(2023, 1, 1), effectiveTo: d(2023, 1, 30) },
      { ratePercent: 13, effectiveFrom: d(2023, 1, 31), effectiveTo: d(2023, 3, 1) },
      { ratePercent: 14, effectiveFrom: d(2023, 3, 2), effectiveTo: d(2023, 3, 31) },
      { ratePercent: 15, effectiveFrom: d(2023, 4, 1), effectiveTo: null },
    ];
    expect(calculateInterestPaise(principalPaise, segments, d(2023, 5, 1))).toBe(54_000);
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
