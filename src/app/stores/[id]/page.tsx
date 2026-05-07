import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StoreForm } from "./StoreForm";

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

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, chain, address, lat, lng")
    .eq("id", id)
    .maybeSingle();

  if (!store) notFound();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">Edit store</h1>
        <p className="text-sm text-gray-600 mt-1">
          Setting a location enables travel-cost ranking on Search.
        </p>
      </header>
      <StoreForm
        storeId={store.id}
        defaults={{
          name: store.name,
          chain: store.chain,
          address: store.address,
          lat: store.lat === null ? null : Number(store.lat),
          lng: store.lng === null ? null : Number(store.lng),
        }}
      />
    </div>
  );
}
