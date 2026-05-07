import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StoresList } from "./StoresList";

type ParentRow = { name: string };
type Row = {
  id: string;
  name: string;
  chain: string | null;
  address: string | null;
  unit: string | null;
  parent_store_id: string | null;
  lat: number | string | null;
  lng: number | string | null;
  parent: ParentRow | ParentRow[] | null;
};

export default async function StoresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data: rows } = await supabase
    .from("stores")
    .select(
      "id, name, chain, address, unit, lat, lng, parent_store_id, parent:stores!parent_store_id(name)",
    )
    .order("name", { ascending: true })
    .returns<Row[]>();

  const stores = (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    chain: r.chain,
    address: r.address,
    unit: r.unit,
    parent_store_id: r.parent_store_id,
    parent_name: Array.isArray(r.parent)
      ? (r.parent[0]?.name ?? null)
      : (r.parent?.name ?? null),
    lat: r.lat === null ? null : Number(r.lat),
    lng: r.lng === null ? null : Number(r.lng),
  }));

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Stores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pin shops on a map. Tap any store to set its location, parent mall,
            or unit number.
          </p>
        </div>
        <Link
          href="/stores/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <span className="text-base leading-none">+</span> Add store
        </Link>
      </header>

      <StoresList stores={stores} />
    </div>
  );
}
