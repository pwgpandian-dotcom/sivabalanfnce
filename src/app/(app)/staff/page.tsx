import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { NavHeading } from "../NavHeading";
import { StaffView, type StaffMember } from "./StaffView";
import { StaffSubtitle } from "./StaffSubtitle";

export default async function StaffPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();

  // list_shop_staff is a security-definer RPC (migration 0002). If it hasn't
  // been applied yet, degrade gracefully with a setup notice instead of crashing.
  const { data, error } = await supabase.rpc("list_shop_staff", { p_shop_id: session.shopId });

  const staff: StaffMember[] = (data ?? []).map(
    (row: { user_id: string; name: string; email: string; role: string }) => ({
      userId: row.user_id,
      name: row.name,
      email: row.email,
      role: row.role === "admin" ? "admin" : "staff",
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <NavHeading navKey="staff" />
        <StaffSubtitle />
      </div>
      <StaffView
        staff={staff}
        currentUserId={session.userId}
        isAdmin={session.role === "admin"}
        setupNeeded={Boolean(error)}
      />
    </div>
  );
}
