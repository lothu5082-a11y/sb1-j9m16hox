"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CURRENCIES } from "@/lib/currencies";
import type { Profile } from "@/lib/types";

export default function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();

  const [shopName, setShopName] = useState(profile.shop_name ?? "");
  const [currency, setCurrency] = useState(profile.currency);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("profiles")
      .update({ shop_name: shopName.trim() || null, currency, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-gray-600">Shop name</span>
        <input
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          type="text"
          placeholder="My Shop"
          className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-brand"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-gray-600">Currency</span>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full appearance-none rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-brand"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} — {c.label} ({c.code})
            </option>
          ))}
        </select>
      </label>

      {saved && (
        <p className="rounded-xl bg-sale-soft px-4 py-3 text-sm font-semibold text-sale">✓ Settings saved</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-2xl bg-brand py-4 text-lg font-bold text-white shadow-lg shadow-brand/30 active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
