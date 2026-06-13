"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="w-full rounded-2xl border-2 border-gray-200 bg-white py-4 text-base font-bold text-gray-700 active:scale-[0.98]"
    >
      Sign out
    </button>
  );
}
