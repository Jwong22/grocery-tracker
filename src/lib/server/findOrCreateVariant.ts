import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PackType } from "@/lib/zod/schemas";

export type VariantKey = {
  product_id: string;
  brand: string | null;
  origin_country: string | null;
  pack_type: PackType;
  pack_size_g: number | null;
};

export async function findOrCreateVariant(
  supabase: SupabaseClient,
  key: VariantKey,
): Promise<{ id: string } | { error: string }> {
  let q = supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", key.product_id)
    .eq("pack_type", key.pack_type);

  q = key.brand ? q.eq("brand", key.brand) : q.is("brand", null);
  q = key.origin_country
    ? q.eq("origin_country", key.origin_country)
    : q.is("origin_country", null);
  q =
    key.pack_size_g !== null
      ? q.eq("pack_size_g", key.pack_size_g)
      : q.is("pack_size_g", null);

  const { data: existing, error: findErr } = await q.maybeSingle();
  if (findErr) return { error: `Variant lookup: ${findErr.message}` };
  if (existing?.id) return { id: existing.id };

  const { data: created, error: createErr } = await supabase
    .from("product_variants")
    .insert({
      product_id: key.product_id,
      brand: key.brand,
      origin_country: key.origin_country,
      pack_type: key.pack_type,
      pack_size_g: key.pack_size_g,
    })
    .select("id")
    .single();
  if (createErr) return { error: `Variant: ${createErr.message}` };
  return { id: created.id };
}
