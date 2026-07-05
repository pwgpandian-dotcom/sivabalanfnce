import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { loadMonthlyReport } from "@/lib/reports";
import { NavHeading } from "../NavHeading";
import { ReportsView } from "./ReportsView";
import { ReportsSubtitle } from "./ReportsSubtitle";

export default async function ReportsPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();
  const rows = await loadMonthlyReport(supabase, session.shopId, 12);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <NavHeading navKey="reports" />
        <ReportsSubtitle />
      </div>
      <ReportsView rows={rows} shopName={session.shopName} />
    </div>
  );
}
