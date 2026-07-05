import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/session";
import { DashboardTable } from "./DashboardTable";
import { DashboardHeading, DashboardAddLoanLabel } from "./DashboardHeading";
import { WelcomeBanner } from "./WelcomeBanner";
import { WelcomeVerse } from "../WelcomeVerse";
import { CompanyHeader } from "../CompanyHeader";
import { SummaryCards } from "./SummaryCards";
import { ClosuresChart } from "./ClosuresChart";
import { QuickActions } from "./QuickActions";
import { RecentTransactions } from "./RecentTransactions";
import { loadSummaryStats, loadMonthlyClosures, loadRecentTransactions } from "@/lib/dashboard";
import { loadActiveDashboardLoans } from "@/lib/loanLists";

export default async function DashboardPage() {
  const session = await requireStaffSession();
  const supabase = await createClient();

  const [stats, closures, recentTx, loans] = await Promise.all([
    loadSummaryStats(supabase, session.shopId),
    loadMonthlyClosures(supabase, session.shopId, 12),
    loadRecentTransactions(supabase, session.shopId, 6),
    loadActiveDashboardLoans(supabase, session.shopId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <CompanyHeader />
      <WelcomeBanner shopName={session.shopName} role={session.role} />
      <WelcomeVerse />
      <SummaryCards stats={stats} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClosuresChart buckets={closures} />
        </div>
        <QuickActions />
      </div>
      <RecentTransactions rows={recentTx} />
      <div className="flex items-center justify-between">
        <DashboardHeading />
        <Link
          href="/loans/new"
          className="rounded-lg bg-wine px-4 py-2 text-sm font-medium text-onwine transition-colors hover:bg-wine-deep"
        >
          <DashboardAddLoanLabel />
        </Link>
      </div>
      <DashboardTable loans={loans} />
    </div>
  );
}
