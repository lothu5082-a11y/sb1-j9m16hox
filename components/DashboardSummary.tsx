"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, todayISO } from "@/lib/format";
import type { Transaction } from "@/lib/types";

type Period = "day" | "week" | "month";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

// Inclusive lower-bound date (YYYY-MM-DD) for each period.
function startDate(period: Period): string {
  const now = new Date();
  if (period === "day") return todayISO();
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en-CA");
  }
  // Week starts on Monday.
  const day = now.getDay(); // 0 = Sun
  const diff = (day + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  return monday.toLocaleDateString("en-CA");
}

export default function DashboardSummary({
  transactions,
  currency,
}: {
  transactions: Transaction[];
  currency: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [period, setPeriod] = useState<Period>("day");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this entry?")) return;
    setDeletingId(id);
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    setDeletingId(null);
    if (!error) router.refresh();
  }

  const { sales, expenses, profit, rows } = useMemo(() => {
    const from = startDate(period);
    const rows = transactions
      .filter((t) => t.occurred_on >= from)
      .sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : a.created_at < b.created_at ? 1 : -1));
    const sales = rows.filter((t) => t.type === "sale").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = rows.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { sales, expenses, profit: sales - expenses, rows };
  }, [transactions, period]);

  return (
    <div className="flex flex-col gap-4">
      {/* Period switch. */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-gray-100 p-1.5">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`rounded-xl py-2.5 text-sm font-bold transition ${
              period === key ? "bg-white text-brand shadow" : "text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Headline profit card. */}
      <div className="rounded-2xl bg-brand p-5 text-white shadow-lg shadow-brand/20">
        <p className="text-sm font-medium opacity-80">Net profit</p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums">{formatMoney(profit, currency)}</p>
      </div>

      {/* Sales vs expenses. */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-sale-soft p-4">
          <p className="text-sm font-semibold text-sale">Sales</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-sale">{formatMoney(sales, currency)}</p>
        </div>
        <div className="rounded-2xl bg-expense-soft p-4">
          <p className="text-sm font-semibold text-expense">Expenses</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-expense">{formatMoney(expenses, currency)}</p>
        </div>
      </div>

      {/* Recent transactions for the selected period. */}
      <div>
        <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-gray-400">Transactions</h2>
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-8 text-center text-gray-400">
            No entries yet. Tap <span className="font-bold text-brand">Add</span> to record one.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
            {rows.map((t) => {
              const sale = t.type === "sale";
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-800">
                      {t.description || (sale ? "Sale" : "Expense")}
                    </p>
                    <p className="text-xs text-gray-400">{t.occurred_on}</p>
                  </div>
                  <span
                    className={`shrink-0 font-bold tabular-nums ${sale ? "text-sale" : "text-expense"}`}
                  >
                    {sale ? "+" : "−"}
                    {formatMoney(Number(t.amount), currency)}
                  </span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    aria-label="Delete entry"
                    className="shrink-0 rounded-lg p-2 text-gray-300 transition hover:bg-expense-soft hover:text-expense disabled:opacity-40"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
