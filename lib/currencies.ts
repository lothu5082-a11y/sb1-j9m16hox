// A compact list of common currencies for small shops worldwide.
// `code` is an ISO 4217 code understood by Intl.NumberFormat.
export type Currency = {
  code: string;
  label: string;
  symbol: string;
};

export const CURRENCIES: Currency[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "NGN", label: "Nigerian Naira", symbol: "₦" },
  { code: "KES", label: "Kenyan Shilling", symbol: "KSh" },
  { code: "ZAR", label: "South African Rand", symbol: "R" },
  { code: "GHS", label: "Ghanaian Cedi", symbol: "₵" },
  { code: "PHP", label: "Philippine Peso", symbol: "₱" },
  { code: "IDR", label: "Indonesian Rupiah", symbol: "Rp" },
  { code: "PKR", label: "Pakistani Rupee", symbol: "₨" },
  { code: "BDT", label: "Bangladeshi Taka", symbol: "৳" },
  { code: "BRL", label: "Brazilian Real", symbol: "R$" },
  { code: "MXN", label: "Mexican Peso", symbol: "$" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", label: "Saudi Riyal", symbol: "﷼" },
  { code: "EGP", label: "Egyptian Pound", symbol: "E£" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "VND", label: "Vietnamese Dong", symbol: "₫" },
];

export const DEFAULT_CURRENCY = "USD";

export function isSupportedCurrency(code: string): boolean {
  return CURRENCIES.some((c) => c.code === code);
}
