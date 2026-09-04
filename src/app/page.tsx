import { createClient } from "@/lib/supabase/server";
import { SearchClient, type TravelConfig } from "@/app/search/SearchClient";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const greetingName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "there";

  const { data: settings } = await supabase
    .from("user_settings")
    .select(
      "home_lat, home_lng, petrol_cost_per_km_myr, time_value_per_hour_myr",
    )
    .eq("user_id", user?.id ?? "")
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
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greetingName} <span aria-hidden="true">👋</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {travel ? (
            <>Search a product, or browse every price below.</>
          ) : (
            <>
              Browse every price below. Set your home location in{" "}
              <a className="text-primary hover:underline" href="/settings">
                Settings
              </a>{" "}
              to rank by travel-adjusted cost.
            </>
          )}
        </p>
      </header>

      <SearchClient travel={travel} />
    </div>
  );
}
