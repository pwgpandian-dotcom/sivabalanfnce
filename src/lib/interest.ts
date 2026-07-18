/**
 * Mirrors the `compute_period_interest` / `calculate_interest` Postgres
 * functions in supabase/migrations exactly. Used for instant client-side
 * previews; the RPC call remains the source of truth for any persisted value.
 *
 * Interest is charged in "month units". How a partial month rounds depends on
 * the loan's interest mode (see InterestMode below). The shop's default is
 * "full_month" — whole calendar months elapsed, with ANY leftover days counting
 * as one more full month (an exact monthly anniversary stays whole).
 */

export type InterestMode = "full_month" | "half_month" | "exact_days";

export const DEFAULT_INTEREST_MODE: InterestMode = "full_month";

export const INTEREST_MODES: InterestMode[] = ["full_month", "half_month", "exact_days"];

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

/** start + n calendar months (UTC), clamping the day to the target month's length. */
function addMonthsUTC(date: Date, n: number): Date {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + n, 1));
  const daysInTarget = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), daysInTarget));
  return target;
}

/**
 * Whole calendar months elapsed from start to end, rounding ANY partial month up
 * to a full month. An exact monthly anniversary stays whole (no round-up).
 *   May 1 → Jun 1 = 1,  May 1 → Jun 2 = 2,  May 1 → Jul 7 = 3.
 */
function calendarMonthsRoundUp(start: Date, end: Date): number {
  let completed = 0;
  while (addMonthsUTC(start, completed + 1).getTime() <= end.getTime()) {
    completed += 1;
  }
  const landsOnAnniversary = addMonthsUTC(start, completed).getTime() === end.getTime();
  return landsOnAnniversary ? completed : completed + 1;
}

/**
 * Month units charged for a period, according to the interest mode:
 *   - full_month:  whole calendar months elapsed, any leftover days → +1 whole
 *                  month; an exact anniversary stays whole. Minimum 1.
 *                  May 1 → Jul 7 = 3, May 1 → Jun 1 = 1.
 *   - half_month:  completed 30-day months + (extra days ≤15 → +0.5, else +1),
 *                  min 1. 35d → 1.5, 46d → 2, 12d → 1.
 *   - exact_days:  precise day proration, days / 30 (no rounding, no minimum).
 *                  35d → 1.1666…, 15d → 0.5.
 */
export function monthsForPeriod(
  startDate: Date,
  endDate: Date,
  mode: InterestMode = DEFAULT_INTEREST_MODE
): number {
  const totalDays = daysBetween(startDate, endDate);
  if (totalDays < 0) {
    throw new Error(
      `end_date (${endDate.toISOString()}) must not be before start_date (${startDate.toISOString()})`
    );
  }

  switch (mode) {
    case "exact_days":
      return totalDays / 30;
    case "half_month": {
      const fullMonths = Math.floor(totalDays / 30);
      const extraDays = totalDays - fullMonths * 30;
      let units = fullMonths;
      if (extraDays > 0) units += extraDays <= 15 ? 0.5 : 1;
      return Math.max(1, units);
    }
    case "full_month":
    default:
      return Math.max(1, calendarMonthsRoundUp(startDate, endDate));
  }
}

/** Interest for a given number of months (supports fractional manual overrides). */
export function interestForMonths(principalPaise: number, ratePercent: number, months: number): number {
  return Math.round(principalPaise * (ratePercent / 100) * months);
}

/** Interest for a single rate segment using the given interest mode. */
export function computePeriodInterestPaise(
  principalPaise: number,
  ratePercent: number,
  startDate: Date,
  endDate: Date,
  mode: InterestMode = DEFAULT_INTEREST_MODE
): number {
  return interestForMonths(principalPaise, ratePercent, monthsForPeriod(startDate, endDate, mode));
}

/**
 * Sums compute_period_interest() across every rate segment of a loan, up to
 * asOfDate. Segments starting after asOfDate are ignored; an open segment
 * (effectiveTo === null) is treated as running through asOfDate.
 */
export function calculateInterestPaise(
  principalPaise: number,
  segments: RateSegment[],
  asOfDate: Date,
  mode: InterestMode = DEFAULT_INTEREST_MODE
): number {
  return segments
    .filter((seg) => seg.effectiveFrom <= asOfDate)
    .sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime())
    .reduce((total, seg) => {
      const segEnd =
        seg.effectiveTo !== null && seg.effectiveTo < asOfDate ? seg.effectiveTo : asOfDate;
      return (
        total +
        computePeriodInterestPaise(principalPaise, seg.ratePercent, seg.effectiveFrom, segEnd, mode)
      );
    }, 0);
}
