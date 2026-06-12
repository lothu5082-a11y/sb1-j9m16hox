import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CURRENCY } from "@/lib/currencies";
import type { Profile } from "@/lib/types";

// Loads the signed-in user and their profile for a Server Component.
// Redirects to /login when there is no session. If the profile row is
// missing (e.g. the signup trigger hasn't run yet) it is created on demand.
export async function requireProfile(): Promise<{ userId: string; profile: Profile }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return { userId: user.id, profile: existing as Profile };
  }

  const { data: created } = await supabase
    .from("profiles")
    .insert({ id: user.id, currency: DEFAULT_CURRENCY })
    .select("*")
    .single();

  return { userId: user.id, profile: created as Profile };
}
