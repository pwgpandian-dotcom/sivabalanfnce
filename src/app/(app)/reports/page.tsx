import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { loadReportData } from "@/lib/reports";
import { NavHeading } from "../NavHeading";
import { ReportsView } from "./ReportsView";
import { ReportsSubtitle } from "./ReportsSubtitle";

export default async function ReportsPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();
  const data = await loadReportData(supabase, session.shopId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <NavHeading navKey="reports" />
        <ReportsSubtitle />
      </div>
      <ReportsView data={data} shopName={session.shopName} />
    </div>
  );
}
