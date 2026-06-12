"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Safe to use in Client Components; it only
// ever holds the public anon key and respects Row Level Security.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
