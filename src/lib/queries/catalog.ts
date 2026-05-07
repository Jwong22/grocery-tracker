"use client";

import { createClient } from "@/lib/supabase/client";

export type ProductRow = {
  id: string;
  canonical_name: string;
  category: string | null;
  default_unit: string;
};

export type StoreRow = {
  id: string;
  name: string;
  chain: string | null;
  address: string | null;
  unit: string | null;
  parent_store_id: string | null;
  parent_name: string | null;
};

type RawStoreRow = {
  id: string;
  name: string;
  chain: string | null;
  address: string | null;
  unit: string | null;
  parent_store_id: string | null;
  parent: { name: string } | { name: string }[] | null;
};

export async function searchProducts(query: string): Promise<ProductRow[]> {
  const supabase = createClient();
  const trimmed = query.trim();
  let q = supabase
    .from("products")
    .select("id, canonical_name, category, default_unit")
    .order("canonical_name", { ascending: true })
    .limit(10);
  if (trimmed.length > 0) {
    q = q.ilike("canonical_name", `%${trimmed}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function searchStores(query: string): Promise<StoreRow[]> {
  const supabase = createClient();
  const trimmed = query.trim();
  let q = supabase
    .from("stores")
    .select(
      "id, name, chain, address, unit, parent_store_id, parent:stores!parent_store_id(name)",
    )
    .order("name", { ascending: true })
    .limit(10);
  if (trimmed.length > 0) {
    q = q.ilike("name", `%${trimmed}%`);
  }
  const { data, error } = await q.returns<RawStoreRow[]>();
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    chain: r.chain,
    address: r.address,
    unit: r.unit,
    parent_store_id: r.parent_store_id,
    parent_name: Array.isArray(r.parent)
      ? (r.parent[0]?.name ?? null)
      : (r.parent?.name ?? null),
  }));
}

export type StoreMapRow = {
  id: string;
  name: string;
  chain: string | null;
  address: string | null;
  unit: string | null;
  parent_store_id: string | null;
  parent_name: string | null;
  lat: number | null;
  lng: number | null;
};

type RawStoreMapRow = RawStoreRow & {
  lat: number | string | null;
  lng: number | string | null;
};

export async function getAllStoresForMap(): Promise<StoreMapRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, name, chain, address, unit, lat, lng, parent_store_id, parent:stores!parent_store_id(name)",
    )
    .order("name", { ascending: true })
    .returns<RawStoreMapRow[]>();
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    chain: r.chain,
    address: r.address,
    unit: r.unit,
    parent_store_id: r.parent_store_id,
    parent_name: Array.isArray(r.parent)
      ? (r.parent[0]?.name ?? null)
      : (r.parent?.name ?? null),
    lat: r.lat === null ? null : Number(r.lat),
    lng: r.lng === null ? null : Number(r.lng),
  }));
}

export async function searchTopLevelStores(query: string): Promise<StoreRow[]> {
  const supabase = createClient();
  const trimmed = query.trim();
  let q = supabase
    .from("stores")
    .select(
      "id, name, chain, address, unit, parent_store_id, parent:stores!parent_store_id(name)",
    )
    .is("parent_store_id", null)
    .order("name", { ascending: true })
    .limit(10);
  if (trimmed.length > 0) {
    q = q.ilike("name", `%${trimmed}%`);
  }
  const { data, error } = await q.returns<RawStoreRow[]>();
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    chain: r.chain,
    address: r.address,
    unit: r.unit,
    parent_store_id: r.parent_store_id,
    parent_name: null,
  }));
}
