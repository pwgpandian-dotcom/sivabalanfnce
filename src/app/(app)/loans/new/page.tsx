import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { getNextLoanNumber } from "@/lib/loanNumber";
import { NewLoanForm } from "./NewLoanForm";

export default async function NewLoanPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();

  // Suggested auto number, reusing the smallest gap left by a permanently-deleted
  // loan and mirroring the create_loan RPC exactly. Falls back internally to the
  // shop's next_loan_sequence base when there are no SF- loans yet.
  let suggestedLoanNumber: string;
  try {
    suggestedLoanNumber = await getNextLoanNumber(supabase, session.shopId);
  } catch {
    suggestedLoanNumber = "SF-1701";
  }

  return <NewLoanForm shopId={session.shopId} suggestedLoanNumber={suggestedLoanNumber} />;
}
