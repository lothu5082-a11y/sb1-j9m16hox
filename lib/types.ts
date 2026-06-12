// Shared domain types for ShopBook.

export type TransactionType = "sale" | "expense";

export type Transaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  occurred_on: string; // YYYY-MM-DD (the date the money moved)
  created_at: string;
};

export type Profile = {
  id: string;
  shop_name: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
};
