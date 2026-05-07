-- Mall tenants: a store can be inside another store (the mall),
-- and carry a unit/lot identifier within that parent.
alter table stores
  add column if not exists parent_store_id uuid
    references stores(id) on delete set null,
  add column if not exists unit text;

create index if not exists stores_parent_idx on stores(parent_store_id);

-- Prevent self-parenting and depth > 1 (mall -> tenant; no grandparents).
create or replace function stores_parent_check() returns trigger as $$
begin
  if new.parent_store_id is not null then
    if new.parent_store_id = new.id then
      raise exception 'A store cannot be its own parent';
    end if;
    perform 1 from stores
      where id = new.parent_store_id and parent_store_id is not null;
    if found then
      raise exception 'Parent store must itself be a top-level store';
    end if;
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists stores_parent_check_trg on stores;
create trigger stores_parent_check_trg
  before insert or update on stores
  for each row execute function stores_parent_check();
