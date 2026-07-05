import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { OldLoanScreen } from "./OldLoanScreen";
import type { MigratedLoan } from "./MigratedLoansList";

export default async function OldLoanPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("migration_mode_enabled, next_loan_sequence")
    .eq("id", session.shopId)
    .maybeSingle();

  const migrationModeEnabled = shop ? shop.migration_mode_enabled !== false : true;
  const endingId =
    shop && typeof shop.next_loan_sequence === "number" ? Math.max(shop.next_loan_sequence - 1, 0) : 0;

  // Migrated records (tolerant if is_migrated column isn't there yet).
  const { data } = await supabase
    .from("loans")
    .select(
      `id, loan_number, principal_paise, assessed_value_paise, pledge_item_description,
       pledge_weight_grams, loan_date, customers(name),
       interest_rate_segments(id, rate_percent, effective_to)`
    )
    .eq("shop_id", session.shopId)
    .eq("is_migrated", true)
    .order("created_at", { ascending: false });

  const loans: MigratedLoan[] = (data ?? []).map((loan) => {
    const segments = (loan.interest_rate_segments as { id: string; rate_percent: number; effective_to: string | null }[]) ?? [];
    const open = segments.find((s) => s.effective_to === null) ?? segments[segments.length - 1];
    return {
      id: loan.id,
      loan_number: loan.loan_number,
      customer_name: (loan.customers as unknown as { name: string } | null)?.name ?? "",
      principal_paise: loan.principal_paise,
      assessed_value_paise: loan.assessed_value_paise ?? null,
      pledge_item_description: loan.pledge_item_description,
      pledge_weight_grams: loan.pledge_weight_grams ?? null,
      loan_date: loan.loan_date,
      rate_percent: open?.rate_percent ?? null,
      rate_segment_id: open?.id ?? null,
    };
  });

  return (
    <OldLoanScreen
      shopId={session.shopId}
      endingId={endingId}
      migrationModeEnabled={migrationModeEnabled}
      loans={loans}
    />
  );
}
