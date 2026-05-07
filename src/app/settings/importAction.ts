"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateVariant } from "@/lib/server/findOrCreateVariant";
import {
  findOrCreateProductByName,
  findOrCreateStoreByName,
} from "@/lib/server/findOrCreateByName";
import { PACK_TYPES } from "@/lib/zod/schemas";

const importedPurchaseSchema = z.object({
  price_paid_myr: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  qty: z.union([z.string(), z.number()]).optional().transform((v) => {
    if (v === undefined || v === null || v === "") return 1;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }),
  pack_size_g_at_purchase: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
  purchased_at: z.string().optional().transform((v) =>
    v ? new Date(v).toISOString() : new Date().toISOString(),
  ),
  notes: z.string().nullable().optional(),
  product_variant: z.object({
    brand: z.string().nullable().optional(),
    origin_country: z.string().nullable().optional(),
    pack_type: z.enum(PACK_TYPES).default("loose"),
    pack_size_g: z
      .union([z.string(), z.number(), z.null()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === null || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : null;
      }),
    product: z.object({
      canonical_name: z.string().min(2),
    }),
  }),
  store: z.object({
    name: z.string().min(2),
  }),
});

const importPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  purchases: z.array(importedPurchaseSchema).default([]),
});

export type ImportResult = {
  ok: boolean;
  inserted: number;
  failed: { index: number; message: string }[];
};

export async function importJson(jsonText: string): Promise<ImportResult> {
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

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e: unknown) {
    return {
      ok: false,
      inserted: 0,
      failed: [
        {
          index: -1,
          message: `Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`,
        },
      ],
    };
  }

  const shape = importPayloadSchema.safeParse(parsed);
  if (!shape.success) {
    return {
      ok: false,
      inserted: 0,
      failed: [
        {
          index: -1,
          message:
            shape.error.issues[0]?.message ??
            "Unsupported export shape (expected schemaVersion 1)",
        },
      ],
    };
  }

  let inserted = 0;
  const failed: { index: number; message: string }[] = [];

  for (let i = 0; i < shape.data.purchases.length; i++) {
    const p = shape.data.purchases[i];
    const product = await findOrCreateProductByName(
      supabase,
      p.product_variant.product.canonical_name,
    );
    if ("error" in product) {
      failed.push({ index: i, message: product.error });
      continue;
    }
    const store = await findOrCreateStoreByName(supabase, p.store.name);
    if ("error" in store) {
      failed.push({ index: i, message: store.error });
      continue;
    }
    const variant = await findOrCreateVariant(supabase, {
      product_id: product.id,
      brand: p.product_variant.brand ?? null,
      origin_country: p.product_variant.origin_country ?? null,
      pack_type: p.product_variant.pack_type,
      pack_size_g: p.product_variant.pack_size_g,
    });
    if ("error" in variant) {
      failed.push({ index: i, message: variant.error });
      continue;
    }
    const { error } = await supabase.from("purchases").insert({
      product_variant_id: variant.id,
      store_id: store.id,
      price_paid_myr: p.price_paid_myr,
      qty: p.qty,
      pack_size_g_at_purchase: p.pack_size_g_at_purchase,
      purchased_at: p.purchased_at,
      notes: p.notes ?? null,
    });
    if (error) {
      failed.push({ index: i, message: error.message });
      continue;
    }
    inserted++;
  }

  if (inserted > 0) {
    revalidatePath("/history");
  }

  return { ok: failed.length === 0, inserted, failed };
}
