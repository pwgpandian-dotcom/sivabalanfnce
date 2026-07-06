/** Formats integer paise as a monospace-friendly rupee string, e.g. 700000 -> "₹7,000.00". */
export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

// This app serves a single Indian pawn shop, so every date is Indian Standard
// Time (UTC+5:30, no DST). The server runs in UTC, so we derive the IST calendar
// date explicitly instead of relying on the host timezone — otherwise, between
// 00:00 and 05:30 IST, "today" would resolve to the previous UTC day.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The IST calendar date ("YYYY-MM-DD") for the given instant (defaults to now). */
export function toDateInputValue(date: Date = new Date()): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Whole days elapsed from an IST date string (YYYY-MM-DD) until today in IST. */
export function daysSince(date: string): number {
  const start = Date.parse(date + "T00:00:00Z");
  const today = Date.parse(toDateInputValue() + "T00:00:00Z");
  return Math.round((today - start) / MS_PER_DAY);
}
