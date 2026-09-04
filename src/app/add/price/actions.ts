"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateVariant } from "@/lib/server/findOrCreateVariant";
import { findOrCreateStoreByName } from "@/lib/server/findOrCreateByName";
import { uploadEvidenceFiles } from "@/lib/storage/uploadEvidence";
import {
  createPriceEntrySchema,
  createProductSchema,
  createStoreSchema,
  createStoreWithLocationSchema,
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
  // Reuse an existing store with the same (case/whitespace-insensitive) name
  // instead of creating a duplicate.
  const resolved = await findOrCreateStoreByName(supabase, parsed.data.name);
  if ("error" in resolved) throw new Error(resolved.error);

  const { data, error } = await supabase
    .from("stores")
    .select("id, name, address")
    .eq("id", resolved.id)
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    label: data.name,
    hint: data.address ?? null,
  };
}

export async function createStoreWithLocationAction(input: {
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  place_id?: string | null;
}): Promise<CreatedRef> {
  const { supabase } = await requireUser();
  const parsed = createStoreWithLocationSchema.safeParse({
    name: input.name,
    address: input.address ?? "",
    lat: input.lat,
    lng: input.lng,
    place_id: input.place_id ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid store");
  }

  if (parsed.data.place_id) {
    const { data: existing, error: lookupErr } = await supabase
      .from("stores")
      .select("id, name, address")
      .eq("place_id", parsed.data.place_id)
      .maybeSingle();
    if (lookupErr) throw new Error(lookupErr.message);
    if (existing) {
      return {
        id: existing.id,
        label: existing.name,
        hint: existing.address ?? null,
      };
    }
  }

  // Name-based dedupe fallback (case/whitespace-insensitive) when there's no
  // place_id match — avoids duplicate stores from repeated manual entry.
  const byName = await findOrCreateStoreByName(supabase, parsed.data.name);
  if ("error" in byName) throw new Error(byName.error);
  const { data: nameHit } = await supabase
    .from("stores")
    .select("id, name, address, lat, lng, place_id")
    .eq("id", byName.id)
    .single();
  // If the matched store already has coordinates/place, reuse it as-is.
  if (nameHit && (nameHit.lat != null || nameHit.place_id)) {
    return {
      id: nameHit.id,
      label: nameHit.name,
      hint: nameHit.address ?? null,
    };
  }
  // Otherwise enrich the freshly-found/created store with this location.
  if (nameHit) {
    const { data: updated, error: updErr } = await supabase
      .from("stores")
      .update({
        address: parsed.data.address,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        place_id: parsed.data.place_id,
      })
      .eq("id", nameHit.id)
      .select("id, name, address")
      .single();
    if (updErr) throw new Error(updErr.message);
    revalidatePath("/stores");
    return {
      id: updated.id,
      label: updated.name,
      hint: updated.address ?? null,
    };
  }

  const { data, error } = await supabase
    .from("stores")
    .insert({
      name: parsed.data.name,
      address: parsed.data.address,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      place_id: parsed.data.place_id,
    })
    .select("id, name, address")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/stores");
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
  let user;
  try {
    ({ supabase, user } = await requireUser());
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

  const evidenceFiles = formData
    .getAll("evidence")
    .filter((e): e is File => e instanceof File && e.size > 0);
  const { paths: evidencePaths, errors: uploadErrors } =
    evidenceFiles.length > 0
      ? await uploadEvidenceFiles(supabase, user.id, evidenceFiles)
      : { paths: [] as string[], errors: [] as string[] };

  const qtyObservedRaw = Number(formData.get("qty_observed") ?? "1");
  const qtyObserved =
    Number.isFinite(qtyObservedRaw) && qtyObservedRaw > 0 ? qtyObservedRaw : 1;

  const { error: insertErr } = await supabase.from("price_entries").insert({
    product_variant_id: variant.id,
    store_id: v.store_id,
    price_myr: v.price_myr,
    pack_size_g_observed: v.pack_size_g,
    qty_observed: qtyObserved,
    observed_at: v.observed_at,
    source: "manual",
    notes: v.notes,
    evidence_paths: evidencePaths,
  });

  if (insertErr) {
    return { ok: false, message: insertErr.message };
  }

  // If user also bought this, create a purchase record (+ an order when a
  // coupon/discount or rounding applies, so the actual amount paid is tracked).
  const alsoBought = formData.get("also_bought") === "on";
  if (alsoBought) {
    const qty = Number(formData.get("qty") ?? "1") || 1;
    const discount = Math.max(0, Number(formData.get("discount_myr") ?? "0") || 0);
    const roundingRaw = Number(formData.get("rounding_myr") ?? "0");
    const rounding = Number.isFinite(roundingRaw) ? roundingRaw : 0;
    const subtotal = v.price_myr * qty;

    let orderId: string | null = null;
    if (discount > 0 || rounding !== 0) {
      const total = Math.max(0, subtotal - discount + rounding);
      const { data: order, error: orderErr } = await supabase
        .from("purchase_orders")
        .insert({
          store_id: v.store_id,
          purchased_at: v.observed_at,
          subtotal_myr: subtotal,
          discount_myr: discount,
          rounding_myr: rounding,
          total_myr: total,
          notes: v.notes,
          evidence_paths: evidencePaths,
        })
        .select("id")
        .single();
      if (orderErr) return { ok: false, message: orderErr.message };
      orderId = order.id;
    }

    const { error: purchaseErr } = await supabase.from("purchases").insert({
      product_variant_id: variant.id,
      store_id: v.store_id,
      price_paid_myr: v.price_myr,
      qty,
      pack_size_g_at_purchase: v.pack_size_g,
      purchased_at: v.observed_at,
      notes: v.notes,
      evidence_paths: evidencePaths,
      order_id: orderId,
    });
    if (purchaseErr) return { ok: false, message: purchaseErr.message };
  }

  revalidatePath("/search");
  revalidatePath("/history");
  revalidatePath("/analytics");
  revalidatePath("/");
  const note =
    uploadErrors.length > 0
      ? ` (${uploadErrors.length} attachment${uploadErrors.length === 1 ? "" : "s"} failed)`
      : "";
  const action = alsoBought ? "Price recorded & purchase logged." : "Price recorded.";
  return { ok: true, message: `${action}${note}` };
}

export async function updatePriceEntry(
  entryId: string,
  _prev: PriceFormState | undefined,
  formData: FormData,
): Promise<PriceFormState> {
  let supabase;
  try {
    ({ supabase } = await requireUser());
  } catch {
    return { ok: false, message: "Please sign in again." };
  }

  // Load the existing entry to keep its product + store (store is edited via
  // its own page, not here).
  const { data: existing, error: loadErr } = await supabase
    .from("price_entries")
    .select(
      "id, product_variant:product_variants!inner ( product_id )",
    )
    .eq("id", entryId)
    .maybeSingle()
    .returns<{ id: string; product_variant: { product_id: string } }>();
  if (loadErr) return { ok: false, message: loadErr.message };
  if (!existing) return { ok: false, message: "Price entry not found." };

  const raw = {
    // product_id/store_id come from the existing row; product_id is needed for
    // schema validation, store_id is not edited here.
    product_id: existing.product_variant.product_id,
    store_id: "00000000-0000-0000-0000-000000000000", // placeholder to satisfy schema; not used
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

  // Re-resolve the variant for the (possibly changed) brand/origin/pack.
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

  const qtyObservedRaw = Number(formData.get("qty_observed") ?? "1");
  const qtyObserved =
    Number.isFinite(qtyObservedRaw) && qtyObservedRaw > 0 ? qtyObservedRaw : 1;

  const { data: updated, error: updErr } = await supabase
    .from("price_entries")
    .update({
      product_variant_id: variant.id,
      price_myr: v.price_myr,
      pack_size_g_observed: v.pack_size_g,
      qty_observed: qtyObserved,
      observed_at: v.observed_at,
      notes: v.notes,
    })
    .eq("id", entryId)
    .select("id")
    .maybeSingle();
  if (updErr) return { ok: false, message: updErr.message };
  if (!updated) {
    return {
      ok: false,
      message:
        "Couldn't save — you may not have permission to edit this entry. " +
        "Apply migration 0010 to allow shared edits.",
    };
  }

  revalidatePath("/search");
  revalidatePath("/prices");
  revalidatePath(`/prices/${entryId}`);
  return { ok: true, message: "Price entry updated." };
}

export async function deletePriceEntry(
  entryId: string,
): Promise<{ ok: boolean; message?: string }> {
  let supabase;
  try {
    ({ supabase } = await requireUser());
  } catch {
    return { ok: false, message: "Please sign in again." };
  }

  const { data: deleted, error } = await supabase
    .from("price_entries")
    .delete()
    .eq("id", entryId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!deleted) {
    return {
      ok: false,
      message:
        "Couldn't delete — you may not have permission. Apply migration 0010.",
    };
  }

  revalidatePath("/search");
  revalidatePath("/prices");
  return { ok: true };
}
