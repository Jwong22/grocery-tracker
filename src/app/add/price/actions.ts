"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateVariant } from "@/lib/server/findOrCreateVariant";
import {
  createPriceEntrySchema,
  createProductSchema,
  createStoreSchema,
} from "@/lib/zod/schemas";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export type CreatedRef = { id: string; label: string; hint?: string | null };

export async function createProductAction(name: string): Promise<CreatedRef> {
  const { supabase } = await requireUser();
  const parsed = createProductSchema.safeParse({ canonical_name: name });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid product name",
    );
  }
  const { data, error } = await supabase
    .from("products")
    .insert({
      canonical_name: parsed.data.canonical_name,
      default_unit: parsed.data.default_unit,
    })
    .select("id, canonical_name, category")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    label: data.canonical_name,
    hint: data.category ?? null,
  };
}

export async function createStoreAction(name: string): Promise<CreatedRef> {
  const { supabase } = await requireUser();
  const parsed = createStoreSchema.safeParse({ name });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid store name");
  }
  const { data, error } = await supabase
    .from("stores")
    .insert({ name: parsed.data.name })
    .select("id, name, address")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    label: data.name,
    hint: data.address ?? null,
  };
}

export type PriceFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function submitPriceEntry(
  _prev: PriceFormState | undefined,
  formData: FormData,
): Promise<PriceFormState> {
  let supabase;
  try {
    ({ supabase } = await requireUser());
  } catch {
    return { ok: false, message: "Please sign in again." };
  }

  const raw = {
    product_id: formData.get("product_id"),
    store_id: formData.get("store_id"),
    brand: formData.get("brand"),
    origin_country: formData.get("origin_country"),
    pack_type: formData.get("pack_type"),
    pack_size_g: formData.get("pack_size_g"),
    price_myr: formData.get("price_myr"),
    observed_at: formData.get("observed_at") || undefined,
    notes: formData.get("notes"),
  };

  const parsed = createPriceEntrySchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: flat.fieldErrors as Record<string, string[]>,
    };
  }

  const v = parsed.data;

  const variant = await findOrCreateVariant(supabase, {
    product_id: v.product_id,
    brand: v.brand,
    origin_country: v.origin_country,
    pack_type: v.pack_type,
    pack_size_g: v.pack_size_g,
  });
  if ("error" in variant) {
    return { ok: false, message: variant.error };
  }

  const { error: insertErr } = await supabase.from("price_entries").insert({
    product_variant_id: variant.id,
    store_id: v.store_id,
    price_myr: v.price_myr,
    pack_size_g_observed: v.pack_size_g,
    observed_at: v.observed_at,
    source: "manual",
    notes: v.notes,
  });

  if (insertErr) {
    return { ok: false, message: insertErr.message };
  }

  revalidatePath("/search");
  revalidatePath("/history");
  return { ok: true, message: "Price recorded." };
}
