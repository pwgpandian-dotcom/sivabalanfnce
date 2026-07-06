import type { SupabaseClient } from "@supabase/supabase-js";

// Raw rows for the client-side date-range report (a single fetch; the client
// slices by the selected range/preset without re-hitting the server).
export type ReportLoan = {
  id: string;
  loanNumber: string;
  customerName: string;
  itemType: string | null;
  loanDate: string;
  closedDate: string | null;
  principalPaise: number;
  status: "active" | "closed";
};
export type ReportPayment = {
  paymentDate: string;
  amountPaise: number;
  interestPaise: number;
};
export type ReportData = {
  loans: ReportLoan[];
  payments: ReportPayment[];
  rePledgeDates: string[];
  outstandingPaise: number;
};

export async function loadReportData(supabase: SupabaseClient, shopId: string): Promise<ReportData> {
  const [loansRes, paymentsRes, rpRes] = await Promise.all([
    supabase
      .from("loans")
      .select("id, loan_number, loan_date, closed_date, principal_paise, status, item_type, customers(name)")
      .eq("shop_id", shopId)
      .order("loan_date", { ascending: false }),
    supabase
      .from("payments")
      .select("payment_date, amount_paise, payment_type, auto_calculated_interest_paise, manual_interest_override_paise, loans!inner(shop_id)")
      .eq("loans.shop_id", shopId),
    supabase.from("re_pledges").select("pledge_date, loans!inner(shop_id)").eq("loans.shop_id", shopId),
  ]);

  const loans: ReportLoan[] = (loansRes.data ?? []).map((l) => ({
    id: l.id,
    loanNumber: l.loan_number,
    customerName: (l.customers as unknown as { name: string } | null)?.name ?? "",
    itemType: l.item_type ?? null,
    loanDate: l.loan_date,
    closedDate: l.closed_date,
    principalPaise: l.principal_paise,
    status: l.status === "closed" ? "closed" : "active",
  }));

  const payments: ReportPayment[] = (paymentsRes.data ?? []).map((p) => {
    let interest = 0;
    if (p.payment_type === "interest") interest = p.amount_paise ?? 0;
    else if (p.payment_type === "full_closing")
      interest = p.manual_interest_override_paise ?? p.auto_calculated_interest_paise ?? 0;
    return { paymentDate: p.payment_date, amountPaise: p.amount_paise ?? 0, interestPaise: interest };
  });

  const rePledgeDates = (rpRes.data ?? []).map((r) => r.pledge_date as string).filter(Boolean);
  const outstandingPaise = loans.filter((l) => l.status === "active").reduce((s, l) => s + l.principalPaise, 0);

  return { loans, payments, rePledgeDates, outstandingPaise };
}

export type MonthlyReportRow = {
  monthKey: string; // "YYYY-MM"
  opened: number;
  closed: number;
  interestCollectedPaise: number;
};

function monthKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Per-month summary for a shop over the last `months` months (oldest first):
 *  - opened  = loans whose loan_date falls in the month
 *  - closed  = loans whose closed_date falls in the month
 *  - interestCollected = sum of interest-type payments in the month
 * Over-fetches 12 months so the client range toggle can slice without refetch.
 */
export async function loadMonthlyReport(
  supabase: SupabaseClient,
  shopId: string,
  months = 12
): Promise<MonthlyReportRow[]> {
  const now = new Date();
  const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const startDate = monthKeyOf(firstMonth) + "-01";

  const rows: MonthlyReportRow[] = [];
  const idx = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + i, 1));
    idx.set(monthKeyOf(d), rows.length);
    rows.push({ monthKey: monthKeyOf(d), opened: 0, closed: 0, interestCollectedPaise: 0 });
  }

  const [loansRes, paymentsRes] = await Promise.all([
    supabase
      .from("loans")
      .select("loan_date, closed_date")
      .eq("shop_id", shopId),
    supabase
      .from("payments")
      .select("payment_date, amount_paise, loans!inner(shop_id)")
      .eq("loans.shop_id", shopId)
      .eq("payment_type", "interest")
      .gte("payment_date", startDate),
  ]);

  if (loansRes.error) throw new Error(loansRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);

  for (const loan of loansRes.data ?? []) {
    const openedIdx = loan.loan_date ? idx.get(loan.loan_date.slice(0, 7)) : undefined;
    if (openedIdx !== undefined) rows[openedIdx].opened += 1;
    const closedIdx = loan.closed_date ? idx.get(loan.closed_date.slice(0, 7)) : undefined;
    if (closedIdx !== undefined) rows[closedIdx].closed += 1;
  }

  for (const p of paymentsRes.data ?? []) {
    const i = idx.get(p.payment_date.slice(0, 7));
    if (i !== undefined) rows[i].interestCollectedPaise += p.amount_paise ?? 0;
  }

  return rows;
}
