"use client";

import { createClient } from "@/lib/supabase/client";
import type { PackType } from "@/lib/zod/schemas";

export type SearchFilters = {
  query: string;
  packType?: PackType | "any";
  brand?: string;
  origin?: string;
};

export type SearchHit = {
  entryId: string;
  priceMyr: number;
  observedAt: string;
  unitPricePer100g: number | null;
  packSizeObserved: number | null;
  variant: {
    id: string;
    brand: string | null;
    originCountry: string | null;
    packType: string;
    packSizeG: number | null;
  };
  product: {
    id: string;
    canonicalName: string;
    category: string | null;
  };
  store: {
    id: string;
    name: string;
    chain: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
  };
};

type RawRow = {
  id: string;
  price_myr: number;
  observed_at: string;
  unit_price_per_100g: number | null;
  pack_size_g_observed: number | null;
  product_variant: {
    id: string;
    brand: string | null;
    origin_country: string | null;
    pack_type: string;
    pack_size_g: number | null;
    product: {
      id: string;
      canonical_name: string;
      category: string | null;
    };
  };
  store: {
    id: string;
    name: string;
    chain: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
  };
};

export async function searchCheapest(
  filters: SearchFilters,
): Promise<SearchHit[]> {
  const supabase = createClient();
  const term = filters.query.trim();
  // Empty/short term => browse all recorded prices (no name filter).
  // 1-char terms are treated as "browse all" too, to avoid noisy partials.
  const useNameFilter = term.length >= 2;

  let q = supabase
    .from("price_entries")
    .select(
      `id, price_myr, observed_at, unit_price_per_100g, pack_size_g_observed,
       product_variant:product_variants!inner (
         id, brand, origin_country, pack_type, pack_size_g,
         product:products!inner ( id, canonical_name, category )
       ),
       store:stores!inner ( id, name, chain, address, lat, lng )`,
    )
    .order("price_myr", { ascending: true })
    .limit(200);

  if (useNameFilter) {
    q = q.ilike("product_variant.product.canonical_name", `%${term}%`);
  }

  if (filters.packType && filters.packType !== "any") {
    q = q.eq("product_variant.pack_type", filters.packType);
  }
  if (filters.brand && filters.brand.trim()) {
    q = q.ilike("product_variant.brand", `%${filters.brand.trim()}%`);
  }
  if (filters.origin && filters.origin.trim()) {
    q = q.ilike(
      "product_variant.origin_country",
      `%${filters.origin.trim()}%`,
    );
  }

  const { data, error } = await q.returns<RawRow[]>();
  if (error) throw error;

  return (data ?? []).map((r) => ({
    entryId: r.id,
    priceMyr: Number(r.price_myr),
    observedAt: r.observed_at,
    unitPricePer100g:
      r.unit_price_per_100g === null ? null : Number(r.unit_price_per_100g),
    packSizeObserved:
      r.pack_size_g_observed === null ? null : Number(r.pack_size_g_observed),
    variant: {
      id: r.product_variant.id,
      brand: r.product_variant.brand,
      originCountry: r.product_variant.origin_country,
      packType: r.product_variant.pack_type,
      packSizeG:
        r.product_variant.pack_size_g === null
          ? null
          : Number(r.product_variant.pack_size_g),
    },
    product: {
      id: r.product_variant.product.id,
      canonicalName: r.product_variant.product.canonical_name,
      category: r.product_variant.product.category,
    },
    store: {
      id: r.store.id,
      name: r.store.name,
      chain: r.store.chain,
      address: r.store.address,
      lat: r.store.lat === null ? null : Number(r.store.lat),
      lng: r.store.lng === null ? null : Number(r.store.lng),
    },
  }));
}
