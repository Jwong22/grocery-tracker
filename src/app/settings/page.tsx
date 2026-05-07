import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";
import { DataSection } from "./DataSection";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("user_settings")
    .select(
      "home_lat, home_lng, petrol_cost_per_km_myr, time_value_per_hour_myr, gemini_api_key",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const defaults = {
    home_lat: data?.home_lat ?? null,
    home_lng: data?.home_lng ?? null,
    petrol_cost_per_km_myr: Number(data?.petrol_cost_per_km_myr ?? 0.3),
    time_value_per_hour_myr: Number(data?.time_value_per_hour_myr ?? 20),
    gemini_api_key_present: Boolean(data?.gemini_api_key),
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Home location and travel cost drive the &ldquo;cheapest near me&rdquo;
          ranking.
        </p>
      </header>
      <SettingsForm defaults={defaults} />
      <DataSection />
    </div>
  );
}
