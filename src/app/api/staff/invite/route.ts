import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin-only staff invite. Flow:
 *  1. Authenticate the caller from their session cookie.
 *  2. Confirm the caller is an ADMIN of their shop (never trust a client-sent shop id).
 *  3. Using the service-role client, invite the email (or reuse an existing auth
 *     user) and link them to the shop via staff_shop_roles.
 *
 * The service_role key stays server-side (see lib/supabase/admin.ts).
 */
export async function POST(request: Request) {
  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const role = body.role === "admin" ? "admin" : "staff";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  // 1. Authenticate caller.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // 2. Resolve caller's shop + role; require admin.
  const { data: roleRow } = await supabase
    .from("staff_shop_roles")
    .select("shop_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!roleRow) {
    return NextResponse.json({ error: "No shop linked to this account." }, { status: 403 });
  }
  if (roleRow.role !== "admin") {
    return NextResponse.json({ error: "Only admins can invite staff." }, { status: 403 });
  }
  const shopId = roleRow.shop_id;

  // 3. Privileged operations.
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server not configured for invites." },
      { status: 500 }
    );
  }

  // Try to invite; if the user already exists, reuse their id.
  let invitedUserId: string | null = null;
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);

  if (inviteError) {
    // Most likely "already registered" — look the user up and link them instead.
    const { data: list, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) {
      return NextResponse.json({ error: inviteError.message }, { status: 502 });
    }
    const existing = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (!existing) {
      return NextResponse.json({ error: inviteError.message }, { status: 502 });
    }
    invitedUserId = existing.id;
  } else {
    invitedUserId = inviteData.user?.id ?? null;
  }

  if (!invitedUserId) {
    return NextResponse.json({ error: "Could not resolve the invited user." }, { status: 502 });
  }

  // Link (idempotent) — service role bypasses RLS, which has no INSERT policy.
  const { error: linkError } = await admin
    .from("staff_shop_roles")
    .upsert({ user_id: invitedUserId, shop_id: shopId, role }, { onConflict: "user_id,shop_id" });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
