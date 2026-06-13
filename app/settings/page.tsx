import BottomNav from "@/components/BottomNav";
import SettingsForm from "@/components/SettingsForm";
import SignOutButton from "@/components/SignOutButton";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { profile } = await requireProfile();

  return (
    <main className="px-4 pb-28 pt-6">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400">Set your shop name and local currency.</p>
      </header>

      <SettingsForm profile={profile} />

      <div className="mt-8">
        <SignOutButton />
      </div>

      <BottomNav />
    </main>
  );
}
