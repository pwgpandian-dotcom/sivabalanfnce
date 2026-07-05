/** Localized short month label from a "YYYY-MM" key, e.g. "Feb 26" / "பிப் 26". */
export function monthLabel(monthKey: string, locale: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleDateString(locale === "ta" ? "ta-IN" : "en-IN", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}
