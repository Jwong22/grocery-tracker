import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PriceEditForm } from "./PriceEditForm";

type EntryRow = {
  id: string;
  price_myr: number | string;
  pack_size_g_observed: number | string | null;
  qty_observed: number | string | null;
  observed_at: string;
  notes: string | null;
  product_variant: {
    brand: string | null;
    origin_country: string | null;
    pack_type: string;
    product: { canonical_name: string };
  };
  store: { id: string; name: string; chain: string | null };
};

export default async function EditPricePage({
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

  const { data, error } = await supabase
    .from("price_entries")
    .select(
      `id, price_myr, pack_size_g_observed, qty_observed, observed_at, notes,
       product_variant:product_variants!inner (
         brand, origin_country, pack_type,
         product:products!inner ( canonical_name )
       ),
       store:stores!inner ( id, name, chain )`,
    )
    .eq("id", id)
    .maybeSingle()
    .returns<EntryRow>();

  if (error) throw new Error(`Could not load price entry: ${error.message}`);
  if (!data) notFound();

  const v = data.product_variant;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href={`/prices/${id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to price
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Edit price
        </h1>
        <p className="text-sm text-muted-foreground">
          {v.product.canonical_name}
          {" · "}
          {data.store.name}
          {data.store.chain ? ` · ${data.store.chain}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          Editing the store itself?{" "}
          <Link
            href={`/stores/${data.store.id}`}
            className="text-primary hover:underline"
          >
            Edit store
          </Link>
          {" "}— changes apply everywhere it&rsquo;s used.
        </p>
      </header>

      <PriceEditForm
        entryId={id}
        defaults={{
          price_myr: data.price_myr != null ? String(Number(data.price_myr)) : "",
          pack_size_g:
            data.pack_size_g_observed != null
              ? String(Number(data.pack_size_g_observed))
              : "",
          qty_observed:
            data.qty_observed != null ? String(Number(data.qty_observed)) : "1",
          pack_type: v.pack_type,
          brand: v.brand ?? "",
          origin_country: v.origin_country ?? "",
          observed_at: toLocalDateTime(data.observed_at),
          notes: data.notes ?? "",
        }}
      />
    </div>
  );
}

function toLocalDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
