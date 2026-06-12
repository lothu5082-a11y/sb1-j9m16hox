import BottomNav from "@/components/BottomNav";
import QuickAddForm from "@/components/QuickAddForm";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AddPage() {
  const { profile } = await requireProfile();

  return (
    <main className="px-4 pb-28 pt-6">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">Quick Add</h1>
        <p className="text-sm text-gray-400">Record a sale or expense in seconds.</p>
      </header>

      <QuickAddForm currency={profile.currency} />
      <BottomNav />
    </main>
  );
}
