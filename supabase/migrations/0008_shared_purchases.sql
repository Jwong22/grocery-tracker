-- 0008_shared_purchases.sql
-- Shared spending for a two-person household: both signed-in users are admins
-- and can read/create/update/delete all purchases and purchase orders (not just
-- their own). This mirrors how stores/products are already collaboratively
-- shared. Authorship is still recorded via user_id for reference.
--
-- Privacy note: there is no per-account privacy after this — either user can
-- see and modify the other's purchases. Intended for a trusted couple only.
--
-- Apply via: supabase db push  (or Studio SQL editor).

-- ---------- purchases ----------
drop policy if exists "purchases read own"   on purchases;
drop policy if exists "purchases insert own" on purchases;
drop policy if exists "purchases update own" on purchases;
drop policy if exists "purchases delete own" on purchases;

create policy "purchases read authenticated" on purchases
  for select using (auth.role() = 'authenticated');
-- Keep user_id defaulting to the caller; still require it to be set on insert.
create policy "purchases insert authenticated" on purchases
  for insert with check (auth.role() = 'authenticated');
create policy "purchases update authenticated" on purchases
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "purchases delete authenticated" on purchases
  for delete using (auth.role() = 'authenticated');

-- ---------- purchase_orders ----------
drop policy if exists "orders read own"   on purchase_orders;
drop policy if exists "orders insert own" on purchase_orders;
drop policy if exists "orders update own" on purchase_orders;
drop policy if exists "orders delete own" on purchase_orders;

create policy "orders read authenticated" on purchase_orders
  for select using (auth.role() = 'authenticated');
create policy "orders insert authenticated" on purchase_orders
  for insert with check (auth.role() = 'authenticated');
create policy "orders update authenticated" on purchase_orders
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "orders delete authenticated" on purchase_orders
  for delete using (auth.role() = 'authenticated');
