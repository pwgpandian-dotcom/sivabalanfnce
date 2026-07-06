import { describe, expect, it } from "vitest";
import { formatPaise, formatPaiseAscii } from "../money";

describe("formatPaise (on-screen, ₹ symbol)", () => {
  it("shows two decimals for small amounts (nothing hidden below ₹1000)", () => {
    expect(formatPaise(100)).toBe("₹1.00");
    expect(formatPaise(500)).toBe("₹5.00");
    expect(formatPaise(9999)).toBe("₹99.99");
  });
  it("groups thousands in the Indian style", () => {
    expect(formatPaise(2_500_000)).toBe("₹25,000.00");
  });
});

describe("formatPaiseAscii (PDF/export fallback)", () => {
  it("uses an ASCII 'Rs.' prefix instead of the ₹ glyph", () => {
    expect(formatPaiseAscii(2_500_000)).toBe("Rs. 25,000.00");
    expect(formatPaiseAscii(100)).toBe("Rs. 1.00");
  });

  it("contains only ASCII characters (no U+20B9 that jsPDF cannot render)", () => {
    const out = formatPaiseAscii(12_345_678);
    expect(out).not.toContain("₹");
    for (const ch of out) {
      expect(ch.charCodeAt(0)).toBeLessThan(128);
    }
  });
});
