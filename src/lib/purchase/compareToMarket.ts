import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const TOLERANCE_MYR = 0.005;

export type PriceObservation = {
  product_id: string;
  product_variant_id: string;
  price_myr: number;
  observed_at: string;
  store_id: string;
};

export type Verdict =
  | { kind: "first_record" }
  | { kind: "cheaper"; cheapestMyr: number; deltaMyr: number; cheapestStoreId: string }
  | { kind: "match"; cheapestMyr: number; cheapestStoreId: string }
  | { kind: "pricier"; cheapestMyr: number; deltaMyr: number; cheapestStoreId: string };

type RawJoinedPriceRow = {
  product_variant_id: string;
  price_myr: number | string;
  observed_at: string;
  store_id: string;
  product_variant:
    | { product_id: string }
    | { product_id: string }[]
    | null;
};

// Comparison spans the whole product (e.g. "broccoli"), not just the exact
// variant the user purchased. A broccoli purchase should be compared against
// any other broccoli observation regardless of brand/origin/pack differences.
export async function fetchPriceObservationsForProducts(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<PriceObservation[]> {
  if (productIds.length === 0) return [];
  const { data, error } = await supabase
    .from("price_entries")
    .select(
      "product_variant_id, price_myr, observed_at, store_id, product_variant:product_variants!inner(product_id)",
    )
    .in("product_variant.product_id", productIds)
    .returns<RawJoinedPriceRow[]>();
  if (error) throw error;
  return (data ?? []).map((r) => {
    const pv = Array.isArray(r.product_variant)
      ? r.product_variant[0]
      : r.product_variant;
    return {
      product_id: pv?.product_id ?? "",
      product_variant_id: r.product_variant_id,
      price_myr: Number(r.price_myr),
      observed_at: r.observed_at,
      store_id: r.store_id,
    };
  });
}

// "Current" cheapest = most recent observation per store, then the lowest of
// those. Caller pre-filters observations to the relevant scope (product or
// variant). Avoids ranking a year-old shelf-tag below a stale one elsewhere.
export function currentCheapest(
  observations: PriceObservation[],
): PriceObservation | null {
  const latestPerStore = new Map<string, PriceObservation>();
  for (const o of observations) {
    const existing = latestPerStore.get(o.store_id);
    if (!existing || new Date(o.observed_at) > new Date(existing.observed_at)) {
      latestPerStore.set(o.store_id, o);
    }
  }
  let cheapest: PriceObservation | null = null;
  for (const o of latestPerStore.values()) {
    if (!cheapest || o.price_myr < cheapest.price_myr) cheapest = o;
  }
  return cheapest;
}

export function compareToMarket(args: {
  pricePaidMyr: number;
  observations: PriceObservation[];
}): Verdict {
  const cheapest = currentCheapest(args.observations);
  if (!cheapest) return { kind: "first_record" };

  const delta = args.pricePaidMyr - cheapest.price_myr;
  if (delta < -TOLERANCE_MYR) {
    return {
      kind: "cheaper",
      cheapestMyr: cheapest.price_myr,
      deltaMyr: -delta,
      cheapestStoreId: cheapest.store_id,
    };
  }
  if (delta <= TOLERANCE_MYR) {
    return {
      kind: "match",
      cheapestMyr: cheapest.price_myr,
      cheapestStoreId: cheapest.store_id,
    };
  }
  return {
    kind: "pricier",
    cheapestMyr: cheapest.price_myr,
    deltaMyr: delta,
    cheapestStoreId: cheapest.store_id,
  };
}
