"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      // If email confirmation is disabled, a session is created immediately.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/");
        router.refresh();
      } else {
        setMessage("Check your email to confirm your account, then sign in.");
        setMode("signin");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      router.push("/");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1.5">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-xl py-2.5 text-sm font-bold ${
            mode === "signin" ? "bg-white text-brand shadow" : "text-gray-500"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-xl py-2.5 text-sm font-bold ${
            mode === "signup" ? "bg-white text-brand shadow" : "text-gray-500"
          }`}
        >
          Create account
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-gray-600">Email</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-brand"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-gray-600">Password</span>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={6}
          className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-brand"
        />
      </label>

      {error && (
        <p className="rounded-xl bg-expense-soft px-4 py-3 text-sm font-medium text-expense">{error}</p>
      )}
      {message && (
        <p className="rounded-xl bg-sale-soft px-4 py-3 text-sm font-medium text-sale">{message}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-2xl bg-brand py-4 text-lg font-bold text-white shadow-lg shadow-brand/30 active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
