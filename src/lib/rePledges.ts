import type { SupabaseClient } from "@supabase/supabase-js";

// A loan is a "good re-pledge candidate" when the amount we lent is well below
// the item's assessed value (low loan-to-value) — lots of headroom to re-pledge
// it externally for extra margin. Adjust this single threshold to taste.
export const MAX_LTV_FOR_CANDIDATE = 0.6; // loan given < 60% of assessed value

export type RePledgeRow = {
  id: string;
  loanId: string;
  loanNumber: string;
  customerName: string;
  customerPhone: string | null;
  broker: string;
  receiptNumber: string | null;
  tagNumber: string | null;
  amountPaise: number | null;
  ratePercent: number | null;
  pledgeDate: string;
  status: "active" | "redeemed";
  redeemedDate: string | null;
  notes: string | null;
};

export type CandidateRow = {
  loanId: string;
  loanNumber: string;
  customerName: string;
  principalPaise: number;
  assessedPaise: number;
  ltvPercent: number;
};

/** All re-pledges for a shop (newest first), flattened with loan + customer. */
export async function loadRePledges(supabase: SupabaseClient, shopId: string): Promise<RePledgeRow[]> {
  const { data, error } = await supabase
    .from("re_pledges")
    .select(
      `id, larger_broker_name, larger_broker_receipt_number, external_tag_number, amount_received_paise,
       interest_rate_percent, pledge_date, status, redeemed_date, notes, created_at,
       loans!inner(id, loan_number, shop_id, customers(name, phone))`
    )
    .eq("loans.shop_id", shopId)
    .order("created_at", { ascending: false });

  if (error) return [];

  return (data ?? []).map((r) => {
    const loan = r.loans as unknown as {
      id: string;
      loan_number: string;
      customers: { name: string; phone: string | null } | null;
    };
    return {
      id: r.id,
      loanId: loan.id,
      loanNumber: loan.loan_number,
      customerName: loan.customers?.name ?? "",
      customerPhone: loan.customers?.phone ?? null,
      broker: r.larger_broker_name,
      receiptNumber: r.larger_broker_receipt_number,
      tagNumber: r.external_tag_number,
      amountPaise: r.amount_received_paise,
      ratePercent: r.interest_rate_percent,
      pledgeDate: r.pledge_date,
      status: r.status === "redeemed" ? "redeemed" : "active",
      redeemedDate: r.redeemed_date,
      notes: r.notes,
    };
  });
}

/**
 * Active, in-shop loans (not currently re-pledged) whose loan-to-value is below
 * MAX_LTV_FOR_CANDIDATE — good opportunities to re-pledge externally.
 */
export async function loadRePledgeCandidates(
  supabase: SupabaseClient,
  shopId: string
): Promise<CandidateRow[]> {
  const { data, error } = await supabase
    .from("loans")
    .select("id, loan_number, principal_paise, assessed_value_paise, customers(name)")
    .eq("shop_id", shopId)
    .eq("status", "active")
    .not("assessed_value_paise", "is", null);

  if (error) return [];

  const loans = data ?? [];

  // Exclude loans that already have an active re-pledge.
  const rePledgedIds = new Set<string>();
  if (loans.length > 0) {
    const { data: rp } = await supabase
      .from("re_pledges")
      .select("loan_id, status")
      .in(
        "loan_id",
        loans.map((l) => l.id)
      )
      .eq("status", "active");
    for (const row of rp ?? []) rePledgedIds.add(row.loan_id);
  }

  const out: CandidateRow[] = [];
  for (const loan of loans) {
    const assessed = loan.assessed_value_paise as number | null;
    if (!assessed || assessed <= 0) continue;
    if (rePledgedIds.has(loan.id)) continue;
    const ltv = loan.principal_paise / assessed;
    if (ltv >= MAX_LTV_FOR_CANDIDATE) continue;
    out.push({
      loanId: loan.id,
      loanNumber: loan.loan_number,
      customerName: (loan.customers as unknown as { name: string } | null)?.name ?? "",
      principalPaise: loan.principal_paise,
      assessedPaise: assessed,
      ltvPercent: Math.round(ltv * 100),
    });
  }
  // Lowest LTV first (best opportunities).
  out.sort((a, b) => a.ltvPercent - b.ltvPercent);
  return out;
}
