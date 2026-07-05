import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { loadCustomersWithCounts } from "@/lib/customers";
import { NavHeading } from "../NavHeading";
import { CustomersTable } from "./CustomersTable";
import { AddCustomerLabel } from "./AddCustomerLabel";

export default async function CustomersPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();
  const customers = await loadCustomersWithCounts(supabase, session.shopId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <NavHeading navKey="customers" />
        <Link
          href="/loans/new"
          className="whitespace-nowrap rounded-lg bg-wine px-4 py-2 text-sm font-medium text-onwine transition-colors hover:bg-wine-deep"
        >
          <AddCustomerLabel />
        </Link>
      </div>
      <CustomersTable customers={customers} />
    </div>
  );
}
