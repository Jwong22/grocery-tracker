-- 0010_shared_price_edit.sql
-- Allow shared editing/deleting of price entries. Previously only the original
-- contributor could update/delete (auth.uid() = contributor_id). To match the
-- shared household model (both users are admins over stores/purchases), let any
-- authenticated user edit or delete price entries. Reads/inserts unchanged.

drop policy if exists "prices update own" on price_entries;
drop policy if exists "prices delete own" on price_entries;

create policy "prices update authenticated" on price_entries
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "prices delete authenticated" on price_entries
  for delete
  using (auth.role() = 'authenticated');
