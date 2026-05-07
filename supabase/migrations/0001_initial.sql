-- Grocery Tracker — initial schema
-- Apply via: Supabase Studio → SQL editor → paste & run
-- (or `supabase db push` if using the Supabase CLI with linked project)

create extension if not exists "pg_trgm";

-- ============================================================
-- SHARED TABLES (readable by any authenticated user)
-- ============================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  category text,
  default_unit text not null default 'kg' check (default_unit in ('kg','g','litre','ml','piece')),
  search_aliases text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists products_canonical_name_trgm
  on products using gin (canonical_name gin_trgm_ops);

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  brand text,
  origin_country text,
  pack_type text not null default 'loose'
    check (pack_type in ('loose','packet','bottle','can','bag','box','tray','bunch')),
  pack_size_g numeric,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (product_id, brand, origin_country, pack_type, pack_size_g)
);
create index if not exists product_variants_product_id_idx on product_variants(product_id);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  chain text,
  address text,
  lat numeric,
  lng numeric,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists stores_name_trgm on stores using gin (name gin_trgm_ops);

create table if not exists price_entries (
  id uuid primary key default gen_random_uuid(),
  product_variant_id uuid not null references product_variants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  price_myr numeric not null check (price_myr >= 0),
  pack_size_g_observed numeric,
  unit_price_per_100g numeric generated always as (
    case
      when coalesce(pack_size_g_observed, 0) > 0
        then price_myr / pack_size_g_observed * 100
      else null
    end
  ) stored,
  observed_at timestamptz not null default now(),
  contributor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source text not null default 'manual'
    check (source in ('manual','image','file','smart')),
  evidence_url text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists price_entries_variant_idx on price_entries(product_variant_id);
create index if not exists price_entries_store_idx on price_entries(store_id);
create index if not exists price_entries_observed_at_idx on price_entries(observed_at desc);

-- ============================================================
-- PRIVATE TABLES (per-user, RLS-locked to owner)
-- ============================================================

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_variant_id uuid not null references product_variants(id) on delete restrict,
  store_id uuid not null references stores(id) on delete restrict,
  price_paid_myr numeric not null check (price_paid_myr >= 0),
  qty numeric not null default 1 check (qty > 0),
  pack_size_g_at_purchase numeric,
  purchased_at timestamptz not null default now(),
  evidence_url text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists purchases_user_idx on purchases(user_id, purchased_at desc);

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  home_lat numeric,
  home_lng numeric,
  petrol_cost_per_km_myr numeric not null default 0.30,
  time_value_per_hour_myr numeric not null default 20.00,
  gemini_api_key text,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

alter table products            enable row level security;
alter table product_variants    enable row level security;
alter table stores              enable row level security;
alter table price_entries       enable row level security;
alter table purchases           enable row level security;
alter table user_settings       enable row level security;

-- Shared tables: any authenticated user can read; insert/update by anyone authenticated.
-- Updates limited to creator on the catalog tables to prevent accidental edits to others' rows.

create policy "products read"   on products
  for select using (auth.role() = 'authenticated');
create policy "products insert" on products
  for insert with check (auth.role() = 'authenticated');
create policy "products update own" on products
  for update using (auth.uid() = created_by);

create policy "variants read"   on product_variants
  for select using (auth.role() = 'authenticated');
create policy "variants insert" on product_variants
  for insert with check (auth.role() = 'authenticated');
create policy "variants update own" on product_variants
  for update using (auth.uid() = created_by);

create policy "stores read"   on stores
  for select using (auth.role() = 'authenticated');
create policy "stores insert" on stores
  for insert with check (auth.role() = 'authenticated');
create policy "stores update own" on stores
  for update using (auth.uid() = created_by);

-- Price entries: shared read; insert sets contributor_id to caller; update/delete only own.
create policy "prices read"   on price_entries
  for select using (auth.role() = 'authenticated');
create policy "prices insert" on price_entries
  for insert with check (auth.uid() = contributor_id);
create policy "prices update own" on price_entries
  for update using (auth.uid() = contributor_id);
create policy "prices delete own" on price_entries
  for delete using (auth.uid() = contributor_id);

-- Purchases & settings: strictly per-user.
create policy "purchases read own"   on purchases
  for select using (auth.uid() = user_id);
create policy "purchases insert own" on purchases
  for insert with check (auth.uid() = user_id);
create policy "purchases update own" on purchases
  for update using (auth.uid() = user_id);
create policy "purchases delete own" on purchases
  for delete using (auth.uid() = user_id);

create policy "settings read own"   on user_settings
  for select using (auth.uid() = user_id);
create policy "settings insert own" on user_settings
  for insert with check (auth.uid() = user_id);
create policy "settings update own" on user_settings
  for update using (auth.uid() = user_id);

-- ============================================================
-- STORAGE: receipts bucket for evidence_url uploads
-- ============================================================
-- Run this once in the Supabase dashboard or via:
-- insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
--   on conflict (id) do nothing;

-- Storage RLS: any authenticated user can upload; uploader can read their own files.
-- Configure these in the Supabase dashboard under Storage → Policies for the `receipts` bucket
-- (left as a manual step because storage policies live in storage.objects, not on a per-app table).
