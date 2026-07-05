import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StaffSession = {
  userId: string;
  email: string;
  shopId: string;
  shopName: string;
  role: "staff" | "admin";
};

/** Server-only: resolves the logged-in staff member's shop, or redirects to /login. */
export async function requireStaffSession(): Promise<StaffSession> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: roleRow } = await supabase
    .from("staff_shop_roles")
    .select("shop_id, role, shops(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!roleRow) {
    await supabase.auth.signOut();
    redirect("/login?error=" + encodeURIComponent("No shop is linked to this account yet."));
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    shopId: roleRow.shop_id,
    shopName: (roleRow.shops as unknown as { name: string } | null)?.name ?? "",
    role: roleRow.role as "staff" | "admin",
  };
}
