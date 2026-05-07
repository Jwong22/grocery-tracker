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

  const { error } = await supabase
    .from("stores")
    .update({
      name: parsed.data.name,
      chain: parsed.data.chain,
      address: parsed.data.address,
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
