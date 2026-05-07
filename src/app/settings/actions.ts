"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

const settingsSchema = z.object({
  home_lat: optionalNumber.refine(
    (v) => v === null || (v >= -90 && v <= 90),
    "Latitude must be between -90 and 90",
  ),
  home_lng: optionalNumber.refine(
    (v) => v === null || (v >= -180 && v <= 180),
    "Longitude must be between -180 and 180",
  ),
  petrol_cost_per_km_myr: optionalNumber.refine(
    (v) => v === null || v >= 0,
    "Must be ≥ 0",
  ),
  time_value_per_hour_myr: optionalNumber.refine(
    (v) => v === null || v >= 0,
    "Must be ≥ 0",
  ),
  gemini_api_key: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  groq_api_key: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export type SettingsState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function saveSettings(
  _prev: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };

  const raw = {
    home_lat: formData.get("home_lat"),
    home_lng: formData.get("home_lng"),
    petrol_cost_per_km_myr: formData.get("petrol_cost_per_km_myr"),
    time_value_per_hour_myr: formData.get("time_value_per_hour_myr"),
    gemini_api_key: formData.get("gemini_api_key"),
    groq_api_key: formData.get("groq_api_key"),
  };

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const v = parsed.data;
  const update: Record<string, unknown> = {
    user_id: user.id,
    home_lat: v.home_lat,
    home_lng: v.home_lng,
    updated_at: new Date().toISOString(),
  };
  if (v.petrol_cost_per_km_myr !== null)
    update.petrol_cost_per_km_myr = v.petrol_cost_per_km_myr;
  if (v.time_value_per_hour_myr !== null)
    update.time_value_per_hour_myr = v.time_value_per_hour_myr;
  if (v.gemini_api_key !== null) update.gemini_api_key = v.gemini_api_key;
  if (v.groq_api_key !== null) update.groq_api_key = v.groq_api_key;

  const { error } = await supabase
    .from("user_settings")
    .upsert(update, { onConflict: "user_id" });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/settings");
  revalidatePath("/search");
  return { ok: true, message: "Saved." };
}
