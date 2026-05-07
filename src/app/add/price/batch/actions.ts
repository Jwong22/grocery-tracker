"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateVariant } from "@/lib/server/findOrCreateVariant";
import {
  findOrCreateProductByName,
  findOrCreateStoreByName,
} from "@/lib/server/findOrCreateByName";
import { batchRowSchema } from "@/lib/zod/schemas";

export type BatchSubmitResult = {
  ok: boolean;
  inserted: number;
  failed: { index: number; message: string }[];
};

export async function submitBatch(
  rows: unknown,
): Promise<BatchSubmitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      inserted: 0,
      failed: [{ index: -1, message: "Please sign in again." }],
    };
  }

  const arrayParse = z.array(batchRowSchema).safeParse(rows);
  if (!arrayParse.success) {
    return {
      ok: false,
      inserted: 0,
      failed: [
        {
          index: -1,
          message: arrayParse.error.issues[0]?.message ?? "Invalid batch shape",
        },
      ],
    };
  }
  const parsed = arrayParse.data;

  let inserted = 0;
  const failed: { index: number; message: string }[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i];
    const product = await findOrCreateProductByName(supabase, row.productName);
    if ("error" in product) {
      failed.push({ index: i, message: product.error });
      continue;
    }
    const store = await findOrCreateStoreByName(supabase, row.storeName);
    if ("error" in store) {
      failed.push({ index: i, message: store.error });
      continue;
    }
    const variant = await findOrCreateVariant(supabase, {
      product_id: product.id,
      brand: row.brand,
      origin_country: row.originCountry,
      pack_type: row.packType,
      pack_size_g: row.packSizeG,
    });
    if ("error" in variant) {
      failed.push({ index: i, message: variant.error });
      continue;
    }
    const { error } = await supabase.from("price_entries").insert({
      product_variant_id: variant.id,
      store_id: store.id,
      price_myr: row.priceMyr,
      pack_size_g_observed: row.packSizeG,
      observed_at: row.observedAt,
      source: row.source,
      notes: row.notes,
      evidence_paths: row.evidencePaths,
    });
    if (error) {
      failed.push({ index: i, message: error.message });
      continue;
    }
    inserted++;
  }

  if (inserted > 0) {
    revalidatePath("/search");
    revalidatePath("/history");
  }

  return { ok: failed.length === 0, inserted, failed };
}
