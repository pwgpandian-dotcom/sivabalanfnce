import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for privileged admin operations (e.g. inviting
 * auth users, inserting staff_shop_roles rows that RLS otherwise blocks).
 *
 * SERVER-ONLY. The service_role key bypasses Row Level Security, so this must
 * never be imported into a Client Component or exposed to the browser. Callers
 * are responsible for authorizing the request before using it.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to the server environment to enable staff invites."
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
