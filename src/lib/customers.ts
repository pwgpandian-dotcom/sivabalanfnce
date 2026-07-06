import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomerRow } from "@/app/(app)/customers/CustomersTable";
import type { CustomerLoanRow } from "@/app/(app)/customers/[id]/CustomerDetail";

/** All customers for a shop with their active/closed loan counts, name-sorted. */
export async function loadCustomersWithCounts(
  supabase: SupabaseClient,
  shopId: string
): Promise<CustomerRow[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, loans(status)")
    .eq("shop_id", shopId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => {
    const loans = (c.loans as { status: string }[]) ?? [];
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      activeCount: loans.filter((l) => l.status === "active").length,
      closedCount: loans.filter((l) => l.status === "closed").length,
    };
  });
}

export type CustomerWithLoans = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  id_proof_type: string | null;
  id_number: string | null;
  notes: string | null;
  created_at: string;
  loans: CustomerLoanRow[];
};

/** One customer plus their loans (newest first), shop-scoped. Returns null if not found. */
export async function loadCustomerWithLoans(
  supabase: SupabaseClient,
  shopId: string,
  customerId: string
): Promise<CustomerWithLoans | null> {
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, name, phone, address, email, id_proof_type, id_number, notes, created_at, loans(id, loan_number, principal_paise, loan_date, closed_date, status)"
    )
    .eq("shop_id", shopId)
    .eq("id", customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const loans = ((data.loans as CustomerLoanRow[]) ?? [])
    .slice()
    .sort((a, b) => b.loan_date.localeCompare(a.loan_date));

  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    address: data.address,
    email: data.email ?? null,
    id_proof_type: data.id_proof_type ?? null,
    id_number: data.id_number ?? null,
    notes: data.notes ?? null,
    created_at: data.created_at,
    loans,
  };
}
