import type { SupabaseClient } from "@supabase/supabase-js";
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
    .select("id, loan_number, principal_paise, loan_date, customers(name)")
    .eq("shop_id", shopId)
    .eq("status", "active")
    .order("loan_date", { ascending: true });

  if (error) throw new Error(error.message);

  const loans = data ?? [];

  // Map of loan_id -> active re-pledge broker, so the list can flag re-pledged
  // items. Fetched tolerantly (empty if migration 0005 isn't applied yet).
  const rePledgeByLoan = new Map<string, string>();
  // Map of loan_id -> most recent interest payment date, for the overdue flag.
  const lastInterestByLoan = new Map<string, string>();
  // Map of loan_id -> total interest already collected from the customer. This
  // includes any first-month interest deducted at issuance (recorded as an
  // interest payment), matching the new-loan and closing modules.
  const interestPaidByLoan = new Map<string, number>();
  const loanIds = loans.map((l) => l.id);
  if (loanIds.length > 0) {
    const [rpRes, payRes] = await Promise.all([
      supabase
        .from("re_pledges")
        .select("loan_id, larger_broker_name, status")
        .in("loan_id", loanIds)
        .eq("status", "active"),
      supabase
        .from("payments")
        .select("loan_id, payment_date, amount_paise")
        .in("loan_id", loanIds)
        .eq("payment_type", "interest"),
    ]);
    for (const row of rpRes.data ?? []) {
      if (!rePledgeByLoan.has(row.loan_id)) rePledgeByLoan.set(row.loan_id, row.larger_broker_name);
    }
    for (const p of payRes.data ?? []) {
      const prev = lastInterestByLoan.get(p.loan_id);
      if (!prev || p.payment_date > prev) lastInterestByLoan.set(p.loan_id, p.payment_date);
      interestPaidByLoan.set(p.loan_id, (interestPaidByLoan.get(p.loan_id) ?? 0) + (p.amount_paise ?? 0));
    }
  }

  return loans.map((loan) => {
    // Overdue is measured from the last interest payment (or the loan date if
    // none) — a loan is overdue when interest hasn't been paid for a while.
    const lastInterest = lastInterestByLoan.get(loan.id) ?? loan.loan_date;
    return {
      id: loan.id,
      loanNumber: loan.loan_number,
      customerName: (loan.customers as unknown as { name: string } | null)?.name ?? "",
      principalPaise: loan.principal_paise,
      daysElapsed: daysSince(loan.loan_date),
      overdueDays: daysSince(lastInterest),
      interestPaidPaise: interestPaidByLoan.get(loan.id) ?? 0,
      rePledgeBroker: rePledgeByLoan.get(loan.id) ?? null,
    };
  });
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
