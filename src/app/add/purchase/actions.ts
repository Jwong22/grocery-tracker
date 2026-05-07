"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateVariant } from "@/lib/server/findOrCreateVariant";
import { uploadEvidenceFiles } from "@/lib/storage/uploadEvidence";
import { createPurchaseSchema } from "@/lib/zod/schemas";

export type PurchaseFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function submitPurchase(
  _prev: PurchaseFormState | undefined,
  formData: FormData,
): Promise<PurchaseFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };

  const raw = {
    product_id: formData.get("product_id"),
    store_id: formData.get("store_id"),
    brand: formData.get("brand"),
    origin_country: formData.get("origin_country"),
    pack_type: formData.get("pack_type"),
    pack_size_g: formData.get("pack_size_g"),
    price_paid_myr: formData.get("price_paid_myr"),
    qty: formData.get("qty"),
    purchased_at: formData.get("purchased_at") || undefined,
    notes: formData.get("notes"),
  };

  const parsed = createPurchaseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
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

  const { error: insertErr } = await supabase.from("purchases").insert({
    product_variant_id: variant.id,
    store_id: v.store_id,
    price_paid_myr: v.price_paid_myr,
    qty: v.qty,
    pack_size_g_at_purchase: v.pack_size_g,
    purchased_at: v.purchased_at,
    notes: v.notes,
    evidence_paths: evidencePaths,
  });
  if (insertErr) return { ok: false, message: insertErr.message };

  revalidatePath("/history");
  const note =
    uploadErrors.length > 0
      ? ` (${uploadErrors.length} attachment${uploadErrors.length === 1 ? "" : "s"} failed)`
      : "";
  return { ok: true, message: `Purchase logged.${note}` };
}
