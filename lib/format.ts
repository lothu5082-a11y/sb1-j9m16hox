import { DEFAULT_CURRENCY } from "./currencies";

// Format a number as money in the user's chosen currency.
// Falls back gracefully if the runtime doesn't know the currency code.
export function formatMoney(amount: number, currency: string = DEFAULT_CURRENCY): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// Today's date as YYYY-MM-DD in the user's local timezone.
export function todayISO(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}
