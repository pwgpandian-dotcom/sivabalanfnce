/**
 * Mirrors the `compute_period_interest` / `calculate_interest` Postgres
 * functions in supabase/migrations/0001_init.sql exactly. Used for instant
 * client-side previews; the RPC call remains the source of truth for any
 * persisted value.
 */

export interface RateSegment {
  ratePercent: number;
  effectiveFrom: Date;
  /** null means "currently open" — runs through asOfDate. */
  effectiveTo: Date | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * Whole months charged for a period, using the round-up rule: any partial month
 * rounds up to the next full month, with a minimum of 1 month.
 *   1–30 days → 1 month, 31–60 → 2, 61–90 → 3, "2 months 10 days" (70) → 3.
 */
export function monthsForPeriod(startDate: Date, endDate: Date): number {
  const totalDays = daysBetween(startDate, endDate);
  if (totalDays < 0) {
    throw new Error(
      `end_date (${endDate.toISOString()}) must not be before start_date (${startDate.toISOString()})`
    );
  }
  return Math.max(1, Math.ceil(totalDays / 30));
}

/** Interest for a given number of months (supports fractional manual overrides). */
export function interestForMonths(principalPaise: number, ratePercent: number, months: number): number {
  return Math.round(principalPaise * (ratePercent / 100) * months);
}

/** Interest for a single rate segment using the round-up (min 1 month) rule. */
export function computePeriodInterestPaise(
  principalPaise: number,
  ratePercent: number,
  startDate: Date,
  endDate: Date
): number {
  return interestForMonths(principalPaise, ratePercent, monthsForPeriod(startDate, endDate));
}

/**
 * Sums compute_period_interest() across every rate segment of a loan, up to
 * asOfDate. Segments starting after asOfDate are ignored; an open segment
 * (effectiveTo === null) is treated as running through asOfDate.
 */
export function calculateInterestPaise(
  principalPaise: number,
  segments: RateSegment[],
  asOfDate: Date
): number {
  return segments
    .filter((seg) => seg.effectiveFrom <= asOfDate)
    .sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime())
    .reduce((total, seg) => {
      const segEnd =
        seg.effectiveTo !== null && seg.effectiveTo < asOfDate ? seg.effectiveTo : asOfDate;
      return (
        total + computePeriodInterestPaise(principalPaise, seg.ratePercent, seg.effectiveFrom, segEnd)
      );
    }, 0);
}
