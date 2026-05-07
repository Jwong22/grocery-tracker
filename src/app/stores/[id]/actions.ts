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

  const { error } = await supabase
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
    .eq("id", storeId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/search");
  revalidatePath(`/stores/${storeId}`);
  return { ok: true, message: "Saved." };
}
