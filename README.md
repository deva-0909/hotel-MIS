# Hotel & Restaurant MS

Next.js (App Router) + Supabase staff app for hotel front office, restaurant POS, inventory/procurement, and
unified billing.

## What's here

- **Supabase project**: `hotel-restaurant-ms` (ref `duyqsvueqdmybxlwtuhc`, region `ap-south-1`) — a project
  separate from the Eye Hospital HIMS in the rest of this repo. Schema covers room types/rooms, guests,
  reservations, folio charges, restaurant tables/menu/orders, inventory items/stock ledger, suppliers,
  purchase orders, and invoices/payments. Row-level security is on for every table (any authenticated staff
  member with an active profile can read/write — tighten per-role later if needed).
- **Next.js app** (App Router + TypeScript + Supabase SSR client + TanStack Query), using Server Actions for
  all mutations instead of a separate API layer.
- Seed data (room types/rooms, restaurant tables, a sample menu, inventory items, suppliers) is already
  loaded so the app is usable right after you register a staff account.

## Local development

```bash
npm install
npm run dev
```

`.env.local` already points at the live Supabase project. Copy `.env.example` if you ever need to point at
a different project (then re-run the migrations in `supabase/migrations/` against it).

First run: open the app, click **Register here** on the login screen, and register yourself with the
**Admin** role. Depending on the Supabase project's auth settings, you may need to confirm your email
before you can sign in.

## How the modules fit together

- **Front office** (`/rooms`, `/guests`, `/reservations`): create a reservation, optionally assign a room,
  check the guest in/out. Checkout automatically posts a room-night charge to the reservation's folio.
- **Restaurant / POS** (`/restaurant/tables`, `/restaurant/menu`, `/restaurant/orders`): start an order
  against a table, room service reservation, or takeaway; add items; send to kitchen; bill. Room-service
  orders marked "bill to room" post straight to the guest's folio instead of generating their own invoice.
- **Inventory & procurement** (`/inventory/items`, `/inventory/purchase-orders`, `/inventory/suppliers`):
  track stock levels, record manual stock movements, and raise/receive purchase orders — receiving a PO
  line automatically posts a stock movement and updates the running balance.
- **Billing** (`/billing/invoices`): generate an invoice from a checked-out reservation's folio (rolls up
  room + restaurant + misc charges), or start an ad-hoc invoice. Record payments against any invoice; totals
  and status (draft/issued/partially paid/paid) are recomputed automatically.

## Deploying

Same pattern as the rest of this repo — push to GitHub, then import into Vercel and set:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://duyqsvueqdmybxlwtuhc.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (the anon/publishable key in `.env.example`)

Optionally, for client demos, also set `DEMO_LOGIN_EMAIL` / `DEMO_LOGIN_PASSWORD` to a staff account's
credentials — the app then silently signs in as that account instead of showing the login screen, so it
always opens straight into the dashboard with a "Viewing as (demo)" role switcher in the sidebar. Leave
these unset for a normal deployment with real login.

## Notable gaps / next steps

- **Per-role write permissions** are not enforced yet — any active staff member can write to any table
  (same "internal tool" tradeoff the rest of this repo makes). Add role-scoped policies if you need e.g.
  only accountants to record payments.
- **Housekeeping workflow** is a single status dropdown on `/rooms` — no cleaning task queue or
  turnaround tracking yet.
- **Kitchen display** doesn't exist as its own screen — kitchen staff would currently use the same order
  detail page as waitstaff.
- **Reports** (occupancy trends, revenue by module, stock valuation) aren't built — the dashboard only shows
  today's snapshot.
