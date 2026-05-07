import { createClient } from "@/lib/supabase/server";
import { SearchClient, type TravelConfig } from "./SearchClient";

export default async function SearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: settings } = await supabase
    .from("user_settings")
    .select(
      "home_lat, home_lng, petrol_cost_per_km_myr, time_value_per_hour_myr",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const travel: TravelConfig | null =
    settings?.home_lat != null && settings?.home_lng != null
      ? {
          home: {
            lat: Number(settings.home_lat),
            lng: Number(settings.home_lng),
          },
          petrolPerKmMyr: Number(settings.petrol_cost_per_km_myr ?? 0.3),
          timePerHourMyr: Number(settings.time_value_per_hour_myr ?? 20),
        }
      : null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">Search cheapest</h1>
        <p className="text-sm text-gray-600 mt-1">
          {travel ? (
            <>Ranked by raw price or by travel-adjusted total.</>
          ) : (
            <>
              Set your home location in{" "}
              <a className="text-green-700 underline" href="/settings">
                Settings
              </a>{" "}
              to enable travel-cost ranking.
            </>
          )}
        </p>
      </header>
      <SearchClient travel={travel} />
    </div>
  );
}
