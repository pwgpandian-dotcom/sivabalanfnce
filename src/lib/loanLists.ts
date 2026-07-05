import type { SupabaseClient } from "@supabase/supabase-js";
import { currentInterestOwed } from "@/lib/loans";
import { daysSince } from "@/lib/money";
import type { DashboardLoan } from "@/app/(app)/DashboardTable";
import type { ClosedLoan } from "@/app/(app)/ClosedLoansTable";

/**
 * Active loans for a shop mapped to the dashboard table shape (with days
 * elapsed + live interest owed). Shared by the dashboard and the Active/Overdue
 * list pages so the query + mapping stay in one place.
 */
export async function loadActiveDashboardLoans(
  supabase: SupabaseClient,
  shopId: string
): Promise<DashboardLoan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select(
      "id, loan_number, principal_paise, loan_date, customers(name), interest_rate_segments(rate_percent, effective_from, effective_to)"
    )
    .eq("shop_id", shopId)
    .eq("status", "active")
    .order("loan_date", { ascending: true });

  if (error) throw new Error(error.message);

  const loans = data ?? [];

  // Map of loan_id -> active re-pledge broker, so the list can flag re-pledged
  // items. Fetched tolerantly (empty if migration 0005 isn't applied yet).
  const rePledgeByLoan = new Map<string, string>();
  const loanIds = loans.map((l) => l.id);
  if (loanIds.length > 0) {
    const { data: rp } = await supabase
      .from("re_pledges")
      .select("loan_id, larger_broker_name, status")
      .in("loan_id", loanIds)
      .eq("status", "active");
    for (const row of rp ?? []) {
      if (!rePledgeByLoan.has(row.loan_id)) rePledgeByLoan.set(row.loan_id, row.larger_broker_name);
    }
  }

  return loans.map((loan) => ({
    id: loan.id,
    loanNumber: loan.loan_number,
    customerName: (loan.customers as unknown as { name: string } | null)?.name ?? "",
    principalPaise: loan.principal_paise,
    daysElapsed: daysSince(loan.loan_date),
    interestOwedPaise: currentInterestOwed(loan.principal_paise, loan.interest_rate_segments ?? []),
    rePledgeBroker: rePledgeByLoan.get(loan.id) ?? null,
  }));
}

/** Closed loans for a shop, newest closure first, with total collected per loan. */
export async function loadClosedLoans(
  supabase: SupabaseClient,
  shopId: string
): Promise<ClosedLoan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select(
      "id, loan_number, principal_paise, loan_date, closed_date, customers(name), payments(amount_paise)"
    )
    .eq("shop_id", shopId)
    .eq("status", "closed")
    .order("closed_date", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((loan) => ({
    id: loan.id,
    loanNumber: loan.loan_number,
    customerName: (loan.customers as unknown as { name: string } | null)?.name ?? "",
    principalPaise: loan.principal_paise,
    loanDate: loan.loan_date,
    closedDate: loan.closed_date,
    collectedPaise: ((loan.payments as { amount_paise: number }[]) ?? []).reduce(
      (sum, p) => sum + (p.amount_paise ?? 0),
      0
    ),
  }));
}
