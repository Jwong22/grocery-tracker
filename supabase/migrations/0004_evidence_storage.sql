-- Evidence attachments: replace single evidence_url with a path array.
-- Files live in the private `receipts` bucket under {user_id}/...

alter table price_entries
  drop column if exists evidence_url;
alter table price_entries
  add column if not exists evidence_paths text[] not null default '{}';

alter table purchases
  drop column if exists evidence_url;
alter table purchases
  add column if not exists evidence_paths text[] not null default '{}';

-- Private storage bucket for receipts / shelf-tag photos / source files.
insert into storage.buckets (id, name, public)
  values ('receipts', 'receipts', false)
  on conflict (id) do nothing;

-- Storage RLS: each authenticated user can read/write/delete only files
-- whose path's first folder equals their auth.uid().
drop policy if exists "receipts read own"   on storage.objects;
drop policy if exists "receipts insert own" on storage.objects;
drop policy if exists "receipts update own" on storage.objects;
drop policy if exists "receipts delete own" on storage.objects;

create policy "receipts read own"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "receipts insert own"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "receipts update own"
  on storage.objects for update
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "receipts delete own"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
