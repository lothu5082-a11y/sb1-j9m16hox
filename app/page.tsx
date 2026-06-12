import BottomNav from "@/components/BottomNav";
import DashboardSummary from "@/components/DashboardSummary";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/types";

// Always read fresh data — this is a personal ledger that changes often.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  // Pull the last ~40 days so "today", "this week" and "this month" can all
  // be derived client-side without extra round-trips.
  const since = new Date();
  since.setDate(since.getDate() - 40);
  const sinceISO = since.toLocaleDateString("en-CA");

  const { data } = await supabase
    .from("transactions")
    .select("*")
    .gte("occurred_on", sinceISO)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  const transactions = (data ?? []) as Transaction[];

  return (
    <main className="px-4 pb-28 pt-6">
      <header className="mb-5">
        <p className="text-sm text-gray-400">
          {profile.shop_name ? profile.shop_name : "Welcome back"}
        </p>
        <h1 className="text-2xl font-extrabold text-gray-900">Dashboard</h1>
      </header>

      <DashboardSummary transactions={transactions} currency={profile.currency} />
      <BottomNav />
    </main>
  );
}
