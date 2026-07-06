import { calculateInterestPaise, type RateSegment, type InterestMode, DEFAULT_INTEREST_MODE } from "@/lib/interest";
import { toDateInputValue } from "@/lib/money";

export type RateSegmentRow = {
  rate_percent: number;
  effective_from: string;
  effective_to: string | null;
};

function toDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00Z");
}

export function toRateSegments(rows: RateSegmentRow[]): RateSegment[] {
  return rows.map((r) => ({
    ratePercent: r.rate_percent,
    effectiveFrom: toDate(r.effective_from),
    effectiveTo: r.effective_to ? toDate(r.effective_to) : null,
  }));
}

/** Instant client/server-side preview of interest owed as of today, mirroring calculate_interest() RPC. */
export function currentInterestOwed(
  principalPaise: number,
  segments: RateSegmentRow[],
  mode: InterestMode = DEFAULT_INTEREST_MODE
): number {
  // "Today" in IST (parsed as UTC midnight), consistent with all stored dates.
  const asOf = new Date(toDateInputValue() + "T00:00:00Z");
  return calculateInterestPaise(principalPaise, toRateSegments(segments), asOf, mode);
}

export function currentRate(segments: RateSegmentRow[]): number | null {
  const open = segments.find((s) => s.effective_to === null);
  return open ? open.rate_percent : null;
}

/**
 * A loan is flagged as significantly overdue on the dashboard and overdue list
 * when no interest has been paid for this many days — measured from the last
 * interest payment, or from the loan date if no interest has ever been paid.
 */
export const OVERDUE_THRESHOLD_DAYS = 90;
