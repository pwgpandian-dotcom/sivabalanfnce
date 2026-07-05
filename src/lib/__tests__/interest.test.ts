import { describe, expect, it } from "vitest";
import { calculateInterestPaise, computePeriodInterestPaise, type RateSegment } from "../interest";

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));

describe("computePeriodInterestPaise", () => {
  it("charges nothing for a zero-day period", () => {
    expect(computePeriodInterestPaise(100_000, 10, d(2023, 1, 1), d(2023, 1, 1))).toBe(0);
  });

  it("charges exactly N months for exact 30-day multiples", () => {
    // 60 days = 2 full months, 0 extra days
    expect(computePeriodInterestPaise(100_000, 10, d(2023, 1, 1), d(2023, 3, 2))).toBe(20_000);
  });

  it("charges a half month at exactly 10 extra days", () => {
    // 40 days = 1 full month + 10 extra days -> +0.5
    expect(computePeriodInterestPaise(100_000, 10, d(2023, 1, 1), d(2023, 2, 10))).toBe(15_000);
  });

  it("charges a full extra month at 11 extra days", () => {
    // 41 days = 1 full month + 11 extra days -> +1
    expect(computePeriodInterestPaise(100_000, 10, d(2023, 1, 1), d(2023, 2, 11))).toBe(20_000);
  });

  it("rejects an end date before the start date", () => {
    expect(() => computePeriodInterestPaise(100_000, 10, d(2023, 2, 1), d(2023, 1, 1))).toThrow();
  });
});

describe("calculateInterestPaise", () => {
  it("matches the worked example from the spec (rate change mid-loan)", () => {
    // Loan ₹7000 at 12%, started 27-11-2022; rate changed to 15% on 01-03-2023; closed 20-03-2023.
    const principalPaise = 700_000; // ₹7000
    const segments: RateSegment[] = [
      { ratePercent: 12, effectiveFrom: d(2022, 11, 27), effectiveTo: d(2023, 2, 28) },
      { ratePercent: 15, effectiveFrom: d(2023, 3, 1), effectiveTo: null },
    ];

    // Segment 1: 93 days -> 3 full months + 3 extra days -> 3.5 units -> 700000*0.12*3.5 = 294000
    // Segment 2: 19 days -> 0 full months + 19 extra days -> 1 unit    -> 700000*0.15*1   = 105000
    // Total = 399000 paise (₹3990.00)
    expect(calculateInterestPaise(principalPaise, segments, d(2023, 3, 20))).toBe(399_000);
  });

  it("sums correctly across 3+ rate changes", () => {
    const principalPaise = 100_000;
    const segments: RateSegment[] = [
      { ratePercent: 12, effectiveFrom: d(2023, 1, 1), effectiveTo: d(2023, 1, 30) },
      { ratePercent: 13, effectiveFrom: d(2023, 1, 31), effectiveTo: d(2023, 3, 1) },
      { ratePercent: 14, effectiveFrom: d(2023, 3, 2), effectiveTo: d(2023, 3, 31) },
      { ratePercent: 15, effectiveFrom: d(2023, 4, 1), effectiveTo: null },
    ];

    // Each segment lands on exactly 1 interest unit -> 12000 + 13000 + 14000 + 15000
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

  it("returns zero interest for a brand-new loan (as-of == loan date)", () => {
    const principalPaise = 700_000;
    const segments: RateSegment[] = [{ ratePercent: 12, effectiveFrom: d(2023, 1, 1), effectiveTo: null }];
    expect(calculateInterestPaise(principalPaise, segments, d(2023, 1, 1))).toBe(0);
  });
});
