import type { SupabaseClient } from "@supabase/supabase-js";
import { daysSince } from "@/lib/money";
import { OVERDUE_THRESHOLD_DAYS } from "@/lib/loans";
import type { SummaryStats } from "@/app/(app)/SummaryCards";
import type { ClosureBucket } from "@/app/(app)/ClosuresChart";
import type { Transaction } from "@/app/(app)/TransactionsTable";

/**
 * Aggregates the four dashboard summary figures for a shop. Kept intentionally
 * simple (a handful of queries summed in JS) — volumes for a single pawn shop
 * are small, so this avoids adding new RPCs.
 */
export async function loadSummaryStats(
  supabase: SupabaseClient,
  shopId: string
): Promise<SummaryStats> {
  const [activeRes, closedCountRes, collectedRes, customerRes] = await Promise.all([
    supabase
      .from("loans")
      .select("principal_paise, loan_date")
      .eq("shop_id", shopId)
      .eq("status", "active"),
    supabase
      .from("loans")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .eq("status", "closed"),
    // Total collected across closed loans = sum of every payment on those loans.
    supabase
      .from("payments")
      .select("amount_paise, loans!inner(shop_id, status)")
      .eq("loans.shop_id", shopId)
      .eq("loans.status", "closed"),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId),
  ]);

  if (activeRes.error) throw new Error(activeRes.error.message);
  if (closedCountRes.error) throw new Error(closedCountRes.error.message);
  if (collectedRes.error) throw new Error(collectedRes.error.message);
  if (customerRes.error) throw new Error(customerRes.error.message);

  const activeLoans = activeRes.data ?? [];
  let activePrincipalPaise = 0;
  let overdueCount = 0;
  let overduePrincipalPaise = 0;

  for (const loan of activeLoans) {
    activePrincipalPaise += loan.principal_paise;
    if (daysSince(loan.loan_date) >= OVERDUE_THRESHOLD_DAYS) {
      overdueCount += 1;
      overduePrincipalPaise += loan.principal_paise;
    }
  }

  const closedCollectedPaise = (collectedRes.data ?? []).reduce(
    (sum, row) => sum + (row.amount_paise ?? 0),
    0
  );

  return {
    activeCount: activeLoans.length,
    activePrincipalPaise,
    overdueCount,
    overduePrincipalPaise,
    closedCount: closedCountRes.count ?? 0,
    closedCollectedPaise,
    customerCount: customerRes.count ?? 0,
  };
}

/**
 * Most recent payments across all of a shop's loans, newest first. Pass a limit
 * for the dashboard preview; omit it for the full /transactions view.
 */
export async function loadRecentTransactions(
  supabase: SupabaseClient,
  shopId: string,
  limit?: number
): Promise<Transaction[]> {
  let query = supabase
    .from("payments")
    .select(
      "id, payment_date, amount_paise, payment_type, created_at, loans!inner(id, loan_number, shop_id, customers(name))"
    )
    .eq("loans.shop_id", shopId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (limit !== undefined) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const loan = row.loans as unknown as {
      id: string;
      loan_number: string;
      customers: { name: string } | null;
    };
    return {
      id: row.id,
      loanId: loan.id,
      loanNumber: loan.loan_number,
      customerName: loan.customers?.name ?? "",
      paymentDate: row.payment_date,
      amountPaise: row.amount_paise,
      paymentType: row.payment_type,
    };
  });
}

/** "YYYY-MM" key for a Date's year+month. */
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Zero-filled monthly buckets of loans closed + total collected, for the last
 * `months` months (oldest first). Amount collected is attributed to the month a
 * loan was closed (sum of all its payments). Over-fetches 12 months so the
 * client-side range toggle can slice without a refetch.
 */
export async function loadMonthlyClosures(
  supabase: SupabaseClient,
  shopId: string,
  months = 12
): Promise<ClosureBucket[]> {
  const now = new Date();
  const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

  // Build the ordered, zero-filled bucket list up front.
  const buckets: ClosureBucket[] = [];
  const indexByKey = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + i, 1));
    const key = monthKey(d);
    indexByKey.set(key, buckets.length);
    buckets.push({ monthKey: key, count: 0, collectedPaise: 0 });
  }

  const startDate = monthKey(firstMonth) + "-01";
  const { data, error } = await supabase
    .from("loans")
    .select("closed_date, payments(amount_paise)")
    .eq("shop_id", shopId)
    .eq("status", "closed")
    .gte("closed_date", startDate);

  if (error) throw new Error(error.message);

  for (const loan of data ?? []) {
    if (!loan.closed_date) continue;
    const key = loan.closed_date.slice(0, 7); // YYYY-MM
    const idx = indexByKey.get(key);
    if (idx === undefined) continue;
    const collected = (loan.payments ?? []).reduce(
      (sum: number, p: { amount_paise: number }) => sum + (p.amount_paise ?? 0),
      0
    );
    buckets[idx].count += 1;
    buckets[idx].collectedPaise += collected;
  }

  return buckets;
}
