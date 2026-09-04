import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StoreForm } from "./StoreForm";
import { getStoreUsage } from "./actions";

type ParentRow = { id: string; name: string; address: string | null };

type FullStore = {
  id: string;
  name: string;
  chain: string | null;
  address: string | null;
  unit: string | null;
  lat: number | string | null;
  lng: number | string | null;
  parent_store_id: string | null;
  parent: ParentRow | ParentRow[] | null;
};

type BasicStore = {
  id: string;
  name: string;
  chain: string | null;
  address: string | null;
  lat: number | string | null;
  lng: number | string | null;
};

export default async function EditStorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let store: (BasicStore & Partial<FullStore>) | null = null;
  let migrationMissing = false;

  const full = await supabase
    .from("stores")
    .select(
      "id, name, chain, address, unit, lat, lng, parent_store_id, parent:stores!parent_store_id(id, name, address)",
    )
    .eq("id", id)
    .maybeSingle();

  if (full.error) {
    console.error("[stores/[id]] full query failed:", full.error.message);
    migrationMissing = true;
    const basic = await supabase
      .from("stores")
      .select("id, name, chain, address, lat, lng")
      .eq("id", id)
      .maybeSingle();
    if (basic.error) {
      console.error("[stores/[id]] basic query failed:", basic.error.message);
      throw new Error(`Could not load store: ${basic.error.message}`);
    }
    store = basic.data as BasicStore | null;
  } else {
    store = full.data as FullStore | null;
  }

  if (!store) notFound();

  const parentRaw = (store.parent ?? null) as ParentRow | ParentRow[] | null;
  const parent = Array.isArray(parentRaw) ? (parentRaw[0] ?? null) : parentRaw;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Edit store
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drop a pin on the map for travel-cost ranking. Inside a mall? Link
          the parent and add a unit.
        </p>
      </header>
      {migrationMissing && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          Heads up: the <code>parent_store_id</code> / <code>unit</code>{" "}
          columns aren&rsquo;t in your database yet. Apply{" "}
          <code>supabase/migrations/0002_stores_mall_tenants.sql</code> in
          Supabase Studio to enable mall-tenant linking.
        </div>
      )}
      <StoreForm
        storeId={store.id}
        usage={await getStoreUsage(store.id)}
        defaults={{
          name: store.name,
          chain: store.chain,
          address: store.address,
          unit: store.unit ?? null,
          lat: store.lat === null || store.lat === undefined ? null : Number(store.lat),
          lng: store.lng === null || store.lng === undefined ? null : Number(store.lng),
          parent: parent
            ? { id: parent.id, name: parent.name, address: parent.address }
            : null,
        }}
      />
    </div>
  );
}
