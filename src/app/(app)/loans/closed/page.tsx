import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { loadClosedLoans } from "@/lib/loanLists";
import { NavHeading } from "../../NavHeading";
import { ClosedLoansTable } from "../../ClosedLoansTable";

export default async function ClosedLoansPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();
  const loans = await loadClosedLoans(supabase, session.shopId);

  return (
    <div className="flex flex-col gap-6">
      <NavHeading navKey="closedLoans" count={loans.length} />
      <ClosedLoansTable loans={loans} />
    </div>
  );
}
