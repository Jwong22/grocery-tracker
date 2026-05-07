import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
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
      "home_lat, home_lng, petrol_cost_per_km_myr, time_value_per_hour_myr, gemini_api_key, groq_api_key",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const defaults = {
    home_lat: data?.home_lat ?? null,
    home_lng: data?.home_lng ?? null,
    petrol_cost_per_km_myr: Number(data?.petrol_cost_per_km_myr ?? 0.3),
    time_value_per_hour_myr: Number(data?.time_value_per_hour_myr ?? 20),
    gemini_api_key_present: Boolean(data?.gemini_api_key),
    groq_api_key_present: Boolean(data?.groq_api_key),
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Home location and travel cost drive the &ldquo;cheapest near me&rdquo;
          ranking.
        </p>
      </header>
      <SettingsForm defaults={defaults} />
      <Card className="sm:hidden">
        <CardHeader>
          <CardTitle className="text-base">Stores</CardTitle>
          <CardDescription>
            Manage shops, mall tenants, and locations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/stores"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M3 9 12 3l9 6v11a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9Z" />
            </svg>
            Manage stores
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
          </Link>
        </CardContent>
      </Card>
      <DataSection />
    </div>
  );
}
