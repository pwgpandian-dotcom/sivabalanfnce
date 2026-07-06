import type { SupabaseClient } from "@supabase/supabase-js";

// Matches the shop's physical paper ticket book and the create_loan RPC, which
// generates "SF-" || <sequence> with no zero padding (e.g. SF-1701).
export const LOAN_NUMBER_PREFIX = "SF-";

export function formatLoanNumber(sequence: number): string {
  return `${LOAN_NUMBER_PREFIX}${sequence}`;
}

/** Extract the trailing integer of a loan number, or null if it isn't an SF-<n> number. */
export function parseSequence(loanNumber: string): number | null {
  const match = loanNumber.match(/^SF-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Smallest available loan sequence for a shop, reusing gaps left by permanently
 * deleted loans. Mirrors the create_loan RPC exactly (keep the two in sync):
 *   - No SF-<n> loans yet  → the shop's next_loan_sequence (its configured base).
 *   - A gap in [min..max]  → the smallest missing number (reuses a deleted one).
 *   - No gap               → max + 1 (next sequential).
 * Active and existing closed loans are never reused — only numbers with no row.
 */
export async function getNextLoanNumber(
  supabase: SupabaseClient,
  shopId: string
): Promise<string> {
  const [{ data: loans, error }, { data: shop }] = await Promise.all([
    supabase.from("loans").select("loan_number").eq("shop_id", shopId),
    supabase.from("shops").select("next_loan_sequence").eq("id", shopId).maybeSingle(),
  ]);

  if (error) throw new Error(error.message);

  const used = new Set<number>();
  for (const row of loans ?? []) {
    const seq = parseSequence(row.loan_number);
    if (seq !== null) used.add(seq);
  }

  if (used.size === 0) {
    const base = shop?.next_loan_sequence;
    return formatLoanNumber(typeof base === "number" && base > 0 ? base : 1);
  }

  const max = Math.max(...used);
  const min = Math.min(...used);
  for (let candidate = min; candidate <= max; candidate++) {
    if (!used.has(candidate)) return formatLoanNumber(candidate);
  }
  return formatLoanNumber(max + 1);
}
