import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { LoanDetail, type LoanDetailData } from "./LoanDetail";
import type { LoanEdit } from "./EditLoanForm";
import type { RePledgeHistory } from "./RePledgeSection";

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
       loan_date, status, closed_date, item_type, item_count, remarks, issued_by, received_by,
       customers(id, name, phone, address),
       interest_rate_segments(id, rate_percent, effective_from, effective_to),
       payments(id, payment_date, amount_paise, payment_type, auto_calculated_interest_paise, manual_interest_override_paise, manual_principal_override_paise)`
    )
    .eq("id", id)
    .eq("shop_id", session.shopId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  // Fetched separately + tolerantly so the page still loads if a later migration
  // (re_pledges / loan_edit_history) hasn't been applied yet.
  const [{ data: rePledges }, { data: rpHistory }, { data: history }] = await Promise.all([
    supabase
      .from("re_pledges")
      .select(
        "id, pawn_broker_id, larger_broker_name, larger_broker_receipt_number, external_tag_number, amount_received_paise, pledge_date, status, redeemed_date, notes, created_at"
      )
      .eq("loan_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("re_pledge_history")
      .select("id, re_pledge_id, action, changed_at, previous, re_pledges!inner(loan_id)")
      .eq("re_pledges.loan_id", id)
      .order("changed_at", { ascending: false }),
    supabase
      .from("loan_edit_history")
      .select("id, edited_at, previous")
      .eq("loan_id", id)
      .order("edited_at", { ascending: false }),
  ]);

  const loan = data as unknown as LoanDetailData;
  loan.interest_rate_segments.sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  loan.payments.sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  loan.re_pledges = (rePledges ?? []) as unknown as LoanDetailData["re_pledges"];

  const editHistory = (history ?? []) as unknown as LoanEdit[];
  const rePledgeHistory = (rpHistory ?? []) as unknown as RePledgeHistory[];

  return (
    <LoanDetail
      loan={loan}
      shopId={session.shopId}
      editHistory={editHistory}
      rePledgeHistory={rePledgeHistory}
    />
  );
}
