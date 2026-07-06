import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { NavHeading } from "../NavHeading";
import { SettingsView } from "./SettingsView";

export default async function SettingsPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();

  // Tolerant of migration 0006 not being applied yet (columns may be absent).
  const { data: shop, error } = await supabase
    .from("shops")
    .select("migration_mode_enabled, next_loan_sequence, logo_url")
    .eq("id", session.shopId)
    .maybeSingle();

  const migrationModeEnabled = !error && shop ? shop.migration_mode_enabled !== false : true;
  const nextLoanSequence = !error && shop && typeof shop.next_loan_sequence === "number" ? shop.next_loan_sequence : 1701;
  const logoUrl = !error && shop && typeof shop.logo_url === "string" ? shop.logo_url : null;

  return (
    <div className="flex flex-col gap-6">
      <NavHeading navKey="settings" />
      <SettingsView
        shopId={session.shopId}
        migrationModeEnabled={migrationModeEnabled}
        nextLoanSequence={nextLoanSequence}
        logoUrl={logoUrl}
      />
    </div>
  );
}
