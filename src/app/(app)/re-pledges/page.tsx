import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { loadRePledges, loadRePledgeCandidates } from "@/lib/rePledges";
import { NavHeading } from "../NavHeading";
import { RePledgesSubtitle } from "./RePledgesSubtitle";
import { RePledgesScreen } from "./RePledgesScreen";

export default async function RePledgesPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();

  const [rePledges, candidates] = await Promise.all([
    loadRePledges(supabase, session.shopId),
    loadRePledgeCandidates(supabase, session.shopId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <NavHeading navKey="rePledges" />
        <RePledgesSubtitle />
      </div>
      <RePledgesScreen rePledges={rePledges} candidates={candidates} />
    </div>
  );
}
