import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { loadActiveDashboardLoans } from "@/lib/loanLists";
import { OVERDUE_THRESHOLD_DAYS } from "@/lib/loans";
import { NavHeading } from "../../NavHeading";
import { OverdueTable } from "./OverdueTable";

export default async function OverdueLoansPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();
  const active = await loadActiveDashboardLoans(supabase, session.shopId);
  const overdue = active.filter((loan) => loan.overdueDays >= OVERDUE_THRESHOLD_DAYS);

  return (
    <div className="flex flex-col gap-6">
      <NavHeading navKey="overdue" count={overdue.length} />
      <OverdueTable loans={overdue} />
    </div>
  );
}
