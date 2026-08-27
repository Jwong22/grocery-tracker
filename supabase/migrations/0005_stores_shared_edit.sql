-- 0005_stores_shared_edit.sql
-- Allow shared editing of stores.
--
-- Problem: the original policy "stores update own" only let the row's
-- creator update it (auth.uid() = created_by). In this friends-only app the
-- store catalog is shared (everyone can read and insert stores), so a member
-- editing a store created by someone else had their UPDATE silently match zero
-- rows — no error, but the change never persisted and the form appeared to
-- "revert" to the original value on reload.
--
-- Fix: any authenticated user may update a store, matching how products and
-- variants are meant to be collaboratively maintained. Reads/inserts are
-- unchanged (already authenticated-only).
--
-- Apply via: Supabase Studio → SQL editor → paste & run.

drop policy if exists "stores update own" on stores;

create policy "stores update authenticated" on stores
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
