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

export function daysSince(date: string): number {
  const start = new Date(date + "T00:00:00Z");
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.round((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
