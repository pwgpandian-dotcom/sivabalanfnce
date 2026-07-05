import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { Sidebar } from "./Sidebar";
import { Footer } from "../Footer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaffSession();
  const supabase = await createClient();

  // Drives whether the "Add Old Loan" link shows. Tolerant of migration 0006
  // not being applied yet (column may be absent → default to enabled).
  const { data: shop, error } = await supabase
    .from("shops")
    .select("migration_mode_enabled")
    .eq("id", session.shopId)
    .maybeSingle();
  const migrationModeEnabled = !error && shop ? shop.migration_mode_enabled !== false : true;

  return (
    <div className="flex min-h-screen flex-col md:pl-64">
      <Sidebar shopName={session.shopName} migrationModeEnabled={migrationModeEnabled} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      <Footer />
    </div>
  );
}
