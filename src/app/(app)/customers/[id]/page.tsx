import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { loadCustomerWithLoans } from "@/lib/customers";
import { CustomerDetail } from "./CustomerDetail";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireStaffSession();
  const supabase = await createClient();

  const customer = await loadCustomerWithLoans(supabase, session.shopId, id);
  if (!customer) notFound();

  return <CustomerDetail customer={customer} />;
}
