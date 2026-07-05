import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { ReceiptTicket, type ReceiptData } from "./ReceiptTicket";
import { PrintButton } from "./PrintButton";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireStaffSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("loans")
    .select(
      `loan_number, principal_paise, pledge_item_description, pledge_weight_grams,
       loan_date, assessed_value_paise,
       customers(name, address, phone),
       shops(name, owner_name, address, phone),
       interest_rate_segments(rate_percent, effective_to)`
    )
    .eq("id", id)
    .eq("shop_id", session.shopId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const loan = data as unknown as {
    loan_number: string;
    principal_paise: number;
    pledge_item_description: string;
    pledge_weight_grams: number | null;
    loan_date: string;
    assessed_value_paise: number | null;
    customers: { name: string; address: string | null; phone: string | null } | null;
    shops: { name: string; owner_name: string | null; address: string | null; phone: string | null } | null;
    interest_rate_segments: { rate_percent: number; effective_to: string | null }[];
  };

  const openSeg =
    loan.interest_rate_segments.find((s) => s.effective_to === null) ??
    loan.interest_rate_segments[loan.interest_rate_segments.length - 1];

  const receipt: ReceiptData = {
    loanNumber: loan.loan_number,
    principalPaise: loan.principal_paise,
    pledgeItem: loan.pledge_item_description,
    pledgeWeightGrams: loan.pledge_weight_grams,
    loanDate: loan.loan_date,
    assessedValuePaise: loan.assessed_value_paise,
    customerName: loan.customers?.name ?? "—",
    customerAddress: loan.customers?.address ?? null,
    customerPhone: loan.customers?.phone ?? null,
    shopName: loan.shops?.name ?? "",
    ownerName: loan.shops?.owner_name ?? null,
    shopAddress: loan.shops?.address ?? null,
    shopPhone: loan.shops?.phone ?? null,
    ratePercent: openSeg?.rate_percent ?? null,
  };

  return (
    <div className="min-h-screen bg-white py-8 text-black print:py-0">
      <ReceiptTicket data={receipt} />
      <PrintButton loanId={id} />
    </div>
  );
}
