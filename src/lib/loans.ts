import { calculateInterestPaise, type RateSegment } from "@/lib/interest";

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
export function currentInterestOwed(principalPaise: number, segments: RateSegmentRow[]): number {
  const today = new Date();
  const asOf = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return calculateInterestPaise(principalPaise, toRateSegments(segments), asOf);
}

export function currentRate(segments: RateSegmentRow[]): number | null {
  const open = segments.find((s) => s.effective_to === null);
  return open ? open.rate_percent : null;
}

/** Loans with no payment for this many days or more are flagged as significantly overdue on the dashboard. */
export const OVERDUE_THRESHOLD_DAYS = 90;
