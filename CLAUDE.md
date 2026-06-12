# ShopBook — Project Guide

ShopBook is a **mobile-first web app** that replaces the paper notebook small
shop owners use to track daily **sales** and **expenses**. It is built with
**Next.js (App Router) + Tailwind CSS** on the front end and **Supabase**
(Postgres + Auth) for secure, multi-device cloud storage.

The product goal: a shop owner can open the app on any phone, sign in, and log a
transaction in **under 10 seconds**.

---

## Architecture

```
middleware.ts -> refreshes the Supabase session + guards every route
                 (redirects to /login when signed out)

app/layout.tsx  (phone-width column, global styles)
   |
   |-- app/login/page.tsx     -> components/AuthForm        (email/password)
   |-- app/page.tsx           -> components/DashboardSummary (totals + list)
   |-- app/add/page.tsx       -> components/QuickAddForm     (the core feature)
   |-- app/settings/page.tsx  -> components/SettingsForm + SignOutButton

Server Components read data via  lib/supabase/server.ts  (cookie-based session).
Client Components write data via lib/supabase/client.ts  (browser, anon key).
Row Level Security in Postgres is the real authority -- users only ever touch
their own rows.
```

### Layer responsibilities

| Layer       | File                          | Owns                                                            |
| ----------- | ----------------------------- | -------------------------------------------------------------- |
| Middleware  | `middleware.ts` + `lib/supabase/middleware.ts` | Session refresh, auth route guard.            |
| Auth helper | `lib/auth.ts`                 | `requireProfile()` -- load user + profile, redirect if absent.  |
| Pages       | `app/**/page.tsx`             | Server Components: fetch data, compose the screen.              |
| UI/forms    | `components/*.tsx`            | Client Components: all interactivity and writes.               |
| Transport   | `lib/supabase/{client,server}.ts` | The only Supabase entry points.                            |
| Domain      | `lib/types.ts`, `lib/currencies.ts`, `lib/format.ts` | Types, currency list, money/date helpers. |

---

## Data model (`supabase/migrations/..._create_shopbook_schema.sql`)

- **`profiles`** -- one row per `auth.users` id. Holds `shop_name` and
  `currency` (default `USD`). Auto-created on signup by the `handle_new_user`
  trigger; `lib/auth.ts` also creates it on demand as a fallback.
- **`transactions`** -- `type` (`sale` | `expense`), `amount` (`numeric > 0`),
  `description`, `occurred_on` (date, defaults to today), `created_at`.
- **RLS is ON** for both tables. Every policy is `auth.uid() = <owner column>`,
  so a user can only read/write their own data.

When changing the schema, add a **new** timestamped migration file rather than
editing the existing one.

---

## The core feature -- Quick Add (`components/QuickAddForm.tsx`)

Optimised for speed:

- Large color-coded **Sale (green) / Expense (red)** toggle.
- A hero **amount** field (`inputMode="decimal"` -> numeric keypad, autofocus).
- Optional **note** and a **date** that defaults to today.
- On save it inserts via the browser client, shows a success flash, **clears the
  amount/note and refocuses** so the owner can log the next entry without
  leaving the screen, then `router.refresh()` updates the dashboard.

---

## Design system

Tailwind tokens in `tailwind.config.ts`:

| Token     | Value     | Used for                    |
| --------- | --------- | --------------------------- |
| `sale`    | `#16a34a` | Money **in** (sales)        |
| `expense` | `#dc2626` | Money **out** (expenses)    |
| `brand`   | `#2563eb` | Primary actions / nav       |

UI principles: phone-width centered column, large tap targets, high-contrast
text, a fixed bottom nav (Today / Add / Settings) with a raised central Add
button, and `tabular-nums` for aligned money figures.

---

## Build & run

```bash
npm install
cp .env.example .env.local   # add NEXT_PUBLIC_SUPABASE_URL + ANON_KEY
npm run dev                  # http://localhost:3000
npm run build                # production build
npm run lint                 # eslint-config-next
npm run typecheck            # tsc --noEmit
```

Environment variables required: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (public anon key -- safe in the client because
RLS enforces access).

---

## Conventions

- TypeScript strict mode is on; keep `npm run typecheck` clean.
- Keep all Supabase access inside `lib/supabase/*` and `lib/auth.ts`.
- Server Components fetch; Client Components (`"use client"`) handle input and
  writes. Don't fetch user data in a Client Component when a Server Component
  can do it.
- Never trust the client for authorization -- RLS policies are the source of
  truth. Add matching policies for any new table.
