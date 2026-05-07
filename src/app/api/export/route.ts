import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [purchases, settings] = await Promise.all([
    supabase
      .from("purchases")
      .select(
        `id, price_paid_myr, qty, pack_size_g_at_purchase, purchased_at, notes,
         product_variant:product_variants!inner (
           id, brand, origin_country, pack_type, pack_size_g,
           product:products!inner ( id, canonical_name, category )
         ),
         store:stores!inner ( id, name, chain, address, lat, lng )`,
      )
      .order("purchased_at", { ascending: false }),
    supabase
      .from("user_settings")
      .select(
        "home_lat, home_lng, petrol_cost_per_km_myr, time_value_per_hour_myr",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (purchases.error) {
    return NextResponse.json(
      { error: purchases.error.message },
      { status: 500 },
    );
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    userId: user.id,
    schemaVersion: 1,
    settings: settings.data ?? null,
    purchases: purchases.data ?? [],
  };

  const filename = `grocery-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
