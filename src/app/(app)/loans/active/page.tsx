import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { loadActiveDashboardLoans } from "@/lib/loanLists";
import { DashboardTable } from "../../DashboardTable";
import { NavHeading } from "../../NavHeading";

export default async function ActiveLoansPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();
  const loans = await loadActiveDashboardLoans(supabase, session.shopId);

  return (
    <div className="flex flex-col gap-6">
      <NavHeading navKey="activeLoans" count={loans.length} />
      <DashboardTable loans={loans} />
    </div>
  );
}
