-- Identify Google Places-sourced stores so re-picking the same place returns
-- the existing row instead of inserting a duplicate.
alter table stores add column if not exists place_id text;

-- Consolidate any pre-existing duplicates (same name + same coordinates).
-- We keep the oldest row in each group as the survivor and repoint all
-- references to it before deleting the others.
with dups as (
  select
    id,
    first_value(id) over (
      partition by lower(name), lat, lng
      order by created_at, id
    ) as survivor_id
  from stores
  where lat is not null and lng is not null
)
update price_entries pe
   set store_id = d.survivor_id
  from dups d
 where pe.store_id = d.id
   and pe.store_id <> d.survivor_id;

with dups as (
  select
    id,
    first_value(id) over (
      partition by lower(name), lat, lng
      order by created_at, id
    ) as survivor_id
  from stores
  where lat is not null and lng is not null
)
update purchases p
   set store_id = d.survivor_id
  from dups d
 where p.store_id = d.id
   and p.store_id <> d.survivor_id;

with dups as (
  select
    id,
    first_value(id) over (
      partition by lower(name), lat, lng
      order by created_at, id
    ) as survivor_id
  from stores
  where lat is not null and lng is not null
)
update stores s
   set parent_store_id = d.survivor_id
  from dups d
 where s.parent_store_id = d.id
   and s.parent_store_id <> d.survivor_id;

with dups as (
  select
    id,
    first_value(id) over (
      partition by lower(name), lat, lng
      order by created_at, id
    ) as survivor_id
  from stores
  where lat is not null and lng is not null
)
delete from stores
 where id in (select id from dups where id <> survivor_id);

-- Enforce one row per Google place. Null place_id is allowed for stores
-- created manually (typed name only, no map pick).
create unique index if not exists stores_place_id_unique
  on stores(place_id)
  where place_id is not null;
