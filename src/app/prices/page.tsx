import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const myr = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("en-MY", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

type VariantInfo = {
  id: string;
  brand: string | null;
  origin_country: string | null;
  pack_type: string;
  pack_size_g: number | string | null;
};

type PriceRow = {
  id: string;
  price_myr: number;
  observed_at: string;
  unit_price_per_100g: number | string | null;
  product_variant: (VariantInfo & {
    product: { id: string; canonical_name: string; category: string | null };
  }) | null;
  store: { id: string; name: string; chain: string | null } | null;
};

function variantBits(v: VariantInfo): string[] {
  return [
    v.brand,
    v.origin_country,
    v.pack_size_g ? `${Number(v.pack_size_g)}g` : null,
    v.pack_type !== "loose" ? v.pack_type : null,
  ].filter((b): b is string => Boolean(b));
}

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("price_entries")
    .select(
      `id, price_myr, observed_at, unit_price_per_100g,
       product_variant:product_variants!inner (
         id, brand, origin_country, pack_type, pack_size_g,
         product:products!inner ( id, canonical_name, category )
       ),
       store:stores!inner ( id, name, chain )`,
    )
    .order("observed_at", { ascending: false })
    .limit(300)
    .returns<PriceRow[]>();

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          All prices
        </h1>
        <p className="text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  const all = data ?? [];
  const rows = query
    ? all.filter((r) => {
        const name = r.product_variant?.product.canonical_name ?? "";
        const store = r.store?.name ?? "";
        const hay = `${name} ${store}`.toLowerCase();
        return hay.includes(query.toLowerCase());
      })
    : all;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          All prices
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every price entry logged, newest first. Tap one for details.
        </p>
      </header>

      <form action="/prices" method="get">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Filter by item or store…"
          className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {query ? (
              <>No prices match &ldquo;{query}&rdquo;.</>
            ) : (
              <>
                No prices logged yet. Add one from{" "}
                <a className="text-primary hover:underline" href="/add/price">
                  Add entry
                </a>
                .
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </p>
          <ul className="space-y-2.5">
            {rows.map((r) => (
              <PriceCard key={r.id} row={r} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PriceCard({ row }: { row: PriceRow }) {
  const v = row.product_variant;
  const name = v?.product.canonical_name ?? "Unknown item";
  const bits = v ? variantBits(v) : [];
  const unitPer100g =
    row.unit_price_per_100g != null ? Number(row.unit_price_per_100g) : null;

  return (
    <li className="relative rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-primary/30">
      <Link
        href={`/prices/${row.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={`View price entry for ${name}`}
      />
      <div className="relative flex items-start justify-between gap-3 pointer-events-none">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground truncate">{name}</div>
          {bits.length > 0 && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {bits.join(" · ")}
            </div>
          )}
          {row.store && (
            <div className="text-sm text-foreground mt-1.5 truncate">
              {row.store.name}
              {row.store.chain ? (
                <span className="text-muted-foreground">
                  {" · "}
                  {row.store.chain}
                </span>
              ) : null}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-0.5">
            {dateFmt.format(new Date(row.observed_at))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-semibold text-foreground tabular-nums">
            {myr.format(Number(row.price_myr))}
          </div>
          {unitPer100g != null && (
            <div className="text-xs text-muted-foreground tabular-nums">
              {myr.format(unitPer100g)}/100g
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
