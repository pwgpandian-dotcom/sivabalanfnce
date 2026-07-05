import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { getNextLoanNumber } from "@/lib/loanNumber";
import { NewLoanForm } from "./NewLoanForm";

export default async function NewLoanPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();

  // Suggested auto number comes from the shop's next_loan_sequence (e.g. SF-1701).
  // Fall back to the legacy "last loan + 1" scheme if the column isn't there yet
  // (i.e. migration 0004 not applied), so the New Loan page keeps working.
  let suggestedLoanNumber: string;
  const { data: shop, error } = await supabase
    .from("shops")
    .select("next_loan_sequence")
    .eq("id", session.shopId)
    .maybeSingle();

  if (!error && shop && typeof shop.next_loan_sequence === "number") {
    suggestedLoanNumber = `SF-${shop.next_loan_sequence}`;
  } else {
    suggestedLoanNumber = await getNextLoanNumber(supabase, session.shopId);
  }

  return <NewLoanForm shopId={session.shopId} suggestedLoanNumber={suggestedLoanNumber} />;
}
