import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type PriceObservation = {
  product_variant_id: string;
  price_myr: number;
  observed_at: string;
  store_id: string;
};

export type Verdict =
  | { kind: "first_record" }
  | { kind: "cheapest"; cheapestMyr: number }
  | { kind: "overpaid"; cheapestMyr: number; deltaMyr: number; cheapestStoreId: string };

export async function fetchPriceObservationsForVariants(
  supabase: SupabaseClient,
  variantIds: string[],
): Promise<PriceObservation[]> {
  if (variantIds.length === 0) return [];
  const { data, error } = await supabase
    .from("price_entries")
    .select("product_variant_id, price_myr, observed_at, store_id")
    .in("product_variant_id", variantIds);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    product_variant_id: r.product_variant_id,
    price_myr: Number(r.price_myr),
    observed_at: r.observed_at,
    store_id: r.store_id,
  }));
}

export function compareToMarket(args: {
  variantId: string;
  pricePaidMyr: number;
  purchasedAt: string;
  observations: PriceObservation[];
}): Verdict {
  const purchasedAtMs = new Date(args.purchasedAt).getTime();
  const within = args.observations.filter(
    (o) =>
      o.product_variant_id === args.variantId &&
      Math.abs(new Date(o.observed_at).getTime() - purchasedAtMs) <= WINDOW_MS,
  );
  if (within.length === 0) return { kind: "first_record" };

  const cheapest = within.reduce((min, o) =>
    o.price_myr < min.price_myr ? o : min,
  );

  if (args.pricePaidMyr <= cheapest.price_myr + 0.005) {
    return { kind: "cheapest", cheapestMyr: cheapest.price_myr };
  }
  return {
    kind: "overpaid",
    cheapestMyr: cheapest.price_myr,
    deltaMyr: args.pricePaidMyr - cheapest.price_myr,
    cheapestStoreId: cheapest.store_id,
  };
}
