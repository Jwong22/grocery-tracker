-- 0011_stores_delete.sql
-- Allow authenticated users to delete stores. The app blocks deletion while a
-- store is still referenced (price entries, purchases, orders, sub-stores), so
-- this policy only enables the delete path; the guard lives in the server
-- action getStoreUsage/deleteStore. FK constraints (on delete restrict) are a
-- second line of defense at the DB level.

drop policy if exists "stores delete authenticated" on stores;

create policy "stores delete authenticated" on stores
  for delete
  using (auth.role() = 'authenticated');
