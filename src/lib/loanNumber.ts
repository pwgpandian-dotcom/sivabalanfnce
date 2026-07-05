import type { SupabaseClient } from "@supabase/supabase-js";

// Matches the shop's physical paper ticket book: SF-01, SF-02, SF-03...
export const LOAN_NUMBER_PREFIX = "SF-";
const PAD_WIDTH = 2;

export function formatLoanNumber(sequence: number): string {
  return `${LOAN_NUMBER_PREFIX}${String(sequence).padStart(PAD_WIDTH, "0")}`;
}

function parseSequence(loanNumber: string): number {
  const match = loanNumber.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Next sequential loan_number for a shop, e.g. "SF-01" -> "SF-02".
 * Based on the most recently created loan (any status), not a lexicographic
 * max, since zero-padded string sort breaks once counts pass two digits.
 */
export async function getNextLoanNumber(
  supabase: SupabaseClient,
  shopId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("loans")
    .select("loan_number")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const lastSequence = data ? parseSequence(data.loan_number) : 0;
  return formatLoanNumber(lastSequence + 1);
}
