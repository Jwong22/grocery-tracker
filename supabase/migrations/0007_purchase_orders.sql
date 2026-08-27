-- 0007_purchase_orders.sql
-- Group purchased items into a single order / receipt so a coupon (discount),
-- rounding adjustment, and the actual total paid can be recorded once per trip
-- instead of pretending every item is an isolated positive-price purchase.
--
-- Model:
--   purchase_orders  = one shopping trip / receipt (store, date, subtotal,
--                      discount/coupon, rounding, total paid, evidence).
--   purchases.order_id = optional link from a line item to its order.
--
-- Spending is computed as: sum(purchase_orders.total_myr) for orders, plus
-- sum(price_paid_myr * qty) for purchases that are NOT attached to an order
-- (backwards compatibility for previously-logged standalone purchases).
--
-- Apply via: supabase db push  (or Studio SQL editor).

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  store_id uuid references stores(id) on delete restrict,
  purchased_at timestamptz not null default now(),
  subtotal_myr numeric not null default 0 check (subtotal_myr >= 0),
  discount_myr numeric not null default 0 check (discount_myr >= 0),
  rounding_myr numeric not null default 0,
  total_myr numeric not null default 0 check (total_myr >= 0),
  notes text,
  evidence_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists purchase_orders_user_idx
  on purchase_orders(user_id, purchased_at desc);
create index if not exists purchase_orders_store_idx
  on purchase_orders(store_id);

-- Link line items to an order (nullable: standalone purchases still allowed).
alter table purchases
  add column if not exists order_id uuid references purchase_orders(id) on delete set null;
create index if not exists purchases_order_idx on purchases(order_id);

-- ============================================================
-- ROW-LEVEL SECURITY (owner-only, mirrors purchases)
-- ============================================================
alter table purchase_orders enable row level security;

drop policy if exists "orders read own"   on purchase_orders;
drop policy if exists "orders insert own" on purchase_orders;
drop policy if exists "orders update own" on purchase_orders;
drop policy if exists "orders delete own" on purchase_orders;

create policy "orders read own"   on purchase_orders
  for select using (auth.uid() = user_id);
create policy "orders insert own" on purchase_orders
  for insert with check (auth.uid() = user_id);
create policy "orders update own" on purchase_orders
  for update using (auth.uid() = user_id);
create policy "orders delete own" on purchase_orders
  for delete using (auth.uid() = user_id);
