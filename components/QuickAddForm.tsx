"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CURRENCIES } from "@/lib/currencies";
import { todayISO } from "@/lib/format";
import type { TransactionType } from "@/lib/types";

export default function QuickAddForm({ currency }: { currency: string }) {
  const router = useRouter();
  const supabase = createClient();
  const amountRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<TransactionType>("sale");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;
  const isSale = type === "sale";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      amountRef.current?.focus();
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      router.push("/login");
      return;
    }

    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: user.id,
      type,
      amount: value,
      description: description.trim() || null,
      occurred_on: occurredOn,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    // Fast feedback, then reset for the next entry without leaving the screen.
    setFlash(`${isSale ? "Sale" : "Expense"} of ${symbol}${value} saved`);
    setAmount("");
    setDescription("");
    amountRef.current?.focus();
    router.refresh();
    window.setTimeout(() => setFlash(null), 2500);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Sale / Expense toggle — large, color-coded, one tap. */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1.5">
        <button
          type="button"
          onClick={() => setType("sale")}
          className={`rounded-xl py-4 text-lg font-bold transition ${
            isSale ? "bg-sale text-white shadow" : "text-gray-500"
          }`}
        >
          ↘ Sale
        </button>
        <button
          type="button"
          onClick={() => setType("expense")}
          className={`rounded-xl py-4 text-lg font-bold transition ${
            !isSale ? "bg-expense text-white shadow" : "text-gray-500"
          }`}
        >
          ↗ Expense
        </button>
      </div>

      {/* Amount — the hero field. Numeric keypad on phones. */}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-gray-600">Amount</span>
        <div
          className={`flex items-center gap-2 rounded-2xl border-2 bg-white px-4 ${
            isSale ? "border-sale/40 focus-within:border-sale" : "border-expense/40 focus-within:border-expense"
          }`}
        >
          <span className="text-2xl font-bold text-gray-400">{symbol}</span>
          <input
            ref={amountRef}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            autoFocus
            className="w-full bg-transparent py-4 text-4xl font-bold tabular-nums outline-none placeholder:text-gray-300"
          />
        </div>
      </label>

      {/* Optional note. */}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-gray-600">Note (optional)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          type="text"
          placeholder={isSale ? "e.g. 2 bags of rice" : "e.g. electricity bill"}
          className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-brand"
        />
      </label>

      {/* Date — defaults to today, change only if needed. */}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-gray-600">Date</span>
        <input
          value={occurredOn}
          onChange={(e) => setOccurredOn(e.target.value)}
          type="date"
          max={todayISO()}
          className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-brand"
        />
      </label>

      {error && (
        <p className="rounded-xl bg-expense-soft px-4 py-3 text-sm font-medium text-expense">{error}</p>
      )}
      {flash && (
        <p className="rounded-xl bg-sale-soft px-4 py-3 text-sm font-semibold text-sale">✓ {flash}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className={`mt-1 rounded-2xl py-5 text-xl font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60 ${
          isSale ? "bg-sale shadow-sale/30" : "bg-expense shadow-expense/30"
        }`}
      >
        {saving ? "Saving…" : `Save ${isSale ? "Sale" : "Expense"}`}
      </button>
    </form>
  );
}
