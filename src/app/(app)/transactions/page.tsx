import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { loadRecentTransactions } from "@/lib/dashboard";
import { TransactionsPageClient } from "./TransactionsPageClient";

export default async function TransactionsPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();
  const rows = await loadRecentTransactions(supabase, session.shopId);

  return <TransactionsPageClient rows={rows} />;
}
