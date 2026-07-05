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

/** Interest for a single rate segment using the 30-day / half-month proration rule. */
export function computePeriodInterestPaise(
  principalPaise: number,
  ratePercent: number,
  startDate: Date,
  endDate: Date
): number {
  const totalDays = daysBetween(startDate, endDate);
  if (totalDays < 0) {
    throw new Error(
      `end_date (${endDate.toISOString()}) must not be before start_date (${startDate.toISOString()})`
    );
  }

  const fullMonths = Math.floor(totalDays / 30);
  const extraDays = totalDays - fullMonths * 30;

  let interestUnits: number;
  if (extraDays === 0) {
    interestUnits = fullMonths;
  } else if (extraDays <= 10) {
    interestUnits = fullMonths + 0.5;
  } else {
    interestUnits = fullMonths + 1;
  }

  return Math.round(principalPaise * (ratePercent / 100) * interestUnits);
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
