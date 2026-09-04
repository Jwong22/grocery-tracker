"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateStoreSchema } from "@/lib/zod/schemas";

export type StoreFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function updateStore(
  storeId: string,
  _prev: StoreFormState | undefined,
  formData: FormData,
): Promise<StoreFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };

  const raw = {
    name: formData.get("name"),
    chain: formData.get("chain"),
    address: formData.get("address"),
    unit: formData.get("unit"),
    parent_store_id: formData.get("parent_store_id"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
  };

  const parsed = updateStoreSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  if (parsed.data.parent_store_id === storeId) {
    return {
      ok: false,
      message: "A store can't be its own parent.",
      errors: { parent_store_id: ["Pick a different parent location"] },
    };
  }

  const { data: updated, error } = await supabase
    .from("stores")
    .update({
      name: parsed.data.name,
      chain: parsed.data.chain,
      address: parsed.data.address,
      unit: parsed.data.unit,
      parent_store_id: parsed.data.parent_store_id,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
    })
    .eq("id", storeId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }

  // A zero-row update means RLS blocked it (e.g. you don't own this store).
  // Supabase does not raise an error in that case, so guard against a false
  // "saved" that silently reverts to the original value on reload.
  if (!updated) {
    return {
      ok: false,
      message:
        "Couldn't save — you may not have permission to edit this store " +
        "(it was created by someone else). Apply migration 0006 to allow shared edits.",
    };
  }

  revalidatePath("/search");
  revalidatePath(`/stores/${storeId}`);
  return { ok: true, message: "Store details saved." };
}

export type StoreUsage = {
  prices: number;
  purchases: number;
  orders: number;
  childStores: number;
  total: number;
};

/** Count everything that references this store, to decide if it can be deleted. */
export async function getStoreUsage(storeId: string): Promise<StoreUsage> {
  const supabase = await createClient();

  const [prices, purchases, orders, children] = await Promise.all([
    supabase
      .from("price_entries")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId),
    supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId),
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId),
    supabase
      .from("stores")
      .select("id", { count: "exact", head: true })
      .eq("parent_store_id", storeId),
  ]);

  const p = prices.count ?? 0;
  const pu = purchases.count ?? 0;
  const o = orders.count ?? 0;
  const c = children.count ?? 0;
  return {
    prices: p,
    purchases: pu,
    orders: o,
    childStores: c,
    total: p + pu + o + c,
  };
}

export async function deleteStore(
  storeId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };

  // Block deletion while the store is still referenced anywhere.
  const usage = await getStoreUsage(storeId);
  if (usage.total > 0) {
    const parts: string[] = [];
    if (usage.prices) parts.push(`${usage.prices} price${usage.prices === 1 ? "" : "s"}`);
    if (usage.purchases)
      parts.push(`${usage.purchases} purchase${usage.purchases === 1 ? "" : "s"}`);
    if (usage.orders)
      parts.push(`${usage.orders} order${usage.orders === 1 ? "" : "s"}`);
    if (usage.childStores)
      parts.push(`${usage.childStores} sub-store${usage.childStores === 1 ? "" : "s"}`);
    return {
      ok: false,
      message: `Can't delete — still used by ${parts.join(", ")}. Remove or reassign those first.`,
    };
  }

  const { data: deleted, error } = await supabase
    .from("stores")
    .delete()
    .eq("id", storeId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!deleted) {
    return {
      ok: false,
      message: "Couldn't delete — you may not have permission.",
    };
  }

  revalidatePath("/stores");
  return { ok: true };
}
