import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { LoanDetail, type LoanDetailData } from "./LoanDetail";

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireStaffSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("loans")
    .select(
      `id, loan_number, principal_paise, pledge_item_description, pledge_weight_grams,
       loan_date, status, closed_date,
       customers(name, phone, address),
       interest_rate_segments(id, rate_percent, effective_from, effective_to),
       payments(id, payment_date, amount_paise, payment_type, auto_calculated_interest_paise, manual_interest_override_paise, manual_principal_override_paise)`
    )
    .eq("id", id)
    .eq("shop_id", session.shopId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  // Fetched separately + tolerantly so the page still loads if migration 0005
  // (re_pledges table) hasn't been applied yet.
  const { data: rePledges } = await supabase
    .from("re_pledges")
    .select(
      "id, larger_broker_name, larger_broker_receipt_number, amount_received_paise, interest_rate_percent, pledge_date, status, redeemed_date, notes, created_at"
    )
    .eq("loan_id", id)
    .order("created_at", { ascending: false });

  const loan = data as unknown as LoanDetailData;
  loan.interest_rate_segments.sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  loan.payments.sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  loan.re_pledges = (rePledges ?? []) as unknown as LoanDetailData["re_pledges"];

  return <LoanDetail loan={loan} />;
}
