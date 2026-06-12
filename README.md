# ShopBook 📒

A mobile-first web app that replaces the paper notebook for small shop owners
worldwide. Log a sale or expense in seconds, see your daily / weekly / monthly
totals at a glance, and sign in from any phone to find your data waiting.

Built with **Next.js (App Router)**, **Tailwind CSS** and **Supabase** (Postgres
+ Auth, with Row Level Security).

---

## Features

- **Quick Add** — one-tap Sale/Expense toggle, a big amount keypad, an optional
  note, and a date that defaults to today. Built for a sub-10-second workflow.
- **Dashboard** — net profit plus Sales vs Expenses for Today, this Week, and
  this Month, with a recent-transactions list.
- **Settings** — pick your local currency (20 included: USD, INR, EUR, NGN…)
  and name your shop.
- **Secure cloud storage** — email/password auth; every row is protected by
  Supabase Row Level Security so users only ever see their own data.

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. In the SQL editor, paste and run
   `supabase/migrations/20260612000000_create_shopbook_schema.sql`.
   This creates the `profiles` and `transactions` tables, the RLS policies, and
   the signup trigger.
3. (Optional, recommended for the MVP) Under **Authentication → Providers →
   Email**, turn **off** "Confirm email" so new users can sign in immediately.

### 3. Add your keys

Copy `.env.example` to `.env.local` and fill in the values from
**Project Settings → API**:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Run

```bash
npm run dev          # http://localhost:3000
```

---

## Project structure

```
app/
  layout.tsx            Root layout (phone-width column, metadata)
  page.tsx              Dashboard (server component → DashboardSummary)
  add/page.tsx          Quick Add screen
  settings/page.tsx     Currency + shop name + sign out
  login/page.tsx        Email/password auth
components/
  QuickAddForm.tsx      The core logging form
  DashboardSummary.tsx  Period toggle + totals + recent list
  SettingsForm.tsx      Currency picker
  AuthForm.tsx          Sign in / sign up
  BottomNav.tsx         Today · Add · Settings
lib/
  supabase/client.ts    Browser client
  supabase/server.ts    Server-component client
  supabase/middleware.ts Session refresh + route guard
  auth.ts               requireProfile() helper
  currencies.ts         Supported currency list
  format.ts             Money + date helpers
middleware.ts           Protects every route except /login
supabase/migrations/    Database schema + RLS
```

---

## Scripts

| Command             | Purpose                          |
| ------------------- | -------------------------------- |
| `npm run dev`       | Start the dev server             |
| `npm run build`     | Production build                 |
| `npm run start`     | Run the production build         |
| `npm run lint`      | Lint with `eslint-config-next`   |
| `npm run typecheck` | `tsc --noEmit`                   |
