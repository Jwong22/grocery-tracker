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
    .select("id, name, chain, address")
    .order("name", { ascending: true })
    .limit(10);
  if (trimmed.length > 0) {
    q = q.ilike("name", `%${trimmed}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
