import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import {
  compareToMarket,
  currentCheapest,
  type Verdict,
} from "@/lib/purchase/compareToMarket";
import { Badge } from "@/components/ui/Badge";

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

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|heic|heif)$/i;

type VariantInfo = {
  id: string;
  brand: string | null;
  origin_country: string | null;
  pack_type: string;
  pack_size_g: number | string | null;
};

type PriceEntryRow = {
  id: string;
  price_myr: number;
  observed_at: string;
  pack_size_g_observed: number | null;
  unit_price_per_100g: number | null;
  contributor_id: string;
  notes: string | null;
  product_variant: VariantInfo & {
    product: { id: string; canonical_name: string; category: string | null };
  };
  store: {
    id: string;
    name: string;
    chain: string | null;
    address: string | null;
    lat: number | string | null;
    lng: number | string | null;
  };
};

type PriceListing = {
  id: string;
  price_myr: number;
  observed_at: string;
  unit_price_per_100g: number | null;
  product_variant: VariantInfo;
  store: { id: string; name: string; chain: string | null };
};

type PurchaseListing = {
  id: string;
  price_paid_myr: number;
  qty: number;
  purchased_at: string;
  product_variant: VariantInfo;
  store: { id: string; name: string; chain: string | null };
};

type EvidenceRow = { id: string; evidence_paths: string[] | null };

function variantBitsOf(v: VariantInfo): string[] {
  return [
    v.brand,
    v.origin_country,
    v.pack_size_g ? `${Number(v.pack_size_g)}g` : null,
    v.pack_type !== "loose" ? v.pack_type : null,
  ].filter((b): b is string => Boolean(b));
}

function googleMapsUrl(store: {
  name: string;
  address: string | null;
  lat: number | string | null;
  lng: number | string | null;
}): string {
  const base = "https://www.google.com/maps/search/?api=1&query=";
  const text = [store.name, store.address].filter(Boolean).join(", ");
  if (text) return `${base}${encodeURIComponent(text)}`;
  if (store.lat !== null && store.lng !== null) {
    return `${base}${store.lat},${store.lng}`;
  }
  return "https://www.google.com/maps/";
}

export default async function PriceDetailPage({
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

  const entryQ = await supabase
    .from("price_entries")
    .select(
      `id, price_myr, observed_at, pack_size_g_observed, unit_price_per_100g,
       contributor_id, notes,
       product_variant:product_variants!inner (
         id, brand, origin_country, pack_type, pack_size_g,
         product:products!inner ( id, canonical_name, category )
       ),
       store:stores!inner ( id, name, chain, address, lat, lng )`,
    )
    .eq("id", id)
    .maybeSingle()
    .returns<PriceEntryRow>();

  if (entryQ.error) {
    throw new Error(`Could not load price entry: ${entryQ.error.message}`);
  }
  if (!entryQ.data) notFound();
  const entry = entryQ.data;
  const productId = entry.product_variant.product.id;
  const variantSelect = "id, brand, origin_country, pack_type, pack_size_g";

  const [otherPricesQ, purchasesQ] = await Promise.all([
    supabase
      .from("price_entries")
      .select(
        `id, price_myr, observed_at, unit_price_per_100g,
         product_variant:product_variants!inner ( ${variantSelect}, product_id ),
         store:stores!inner ( id, name, chain )`,
      )
      .eq("product_variant.product_id", productId)
      .order("observed_at", { ascending: false })
      .returns<PriceListing[]>(),
    supabase
      .from("purchases")
      .select(
        `id, price_paid_myr, qty, purchased_at,
         product_variant:product_variants!inner ( ${variantSelect}, product_id ),
         store:stores!inner ( id, name, chain )`,
      )
      .eq("product_variant.product_id", productId)
      .order("purchased_at", { ascending: false })
      .returns<PurchaseListing[]>(),
  ]);

  if (otherPricesQ.error) {
    throw new Error(`Could not load prices: ${otherPricesQ.error.message}`);
  }
  if (purchasesQ.error) {
    throw new Error(`Could not load purchases: ${purchasesQ.error.message}`);
  }

  const allPrices = otherPricesQ.data ?? [];
  const purchases = purchasesQ.data ?? [];

  const observations = allPrices.map((p) => ({
    product_id: productId,
    product_variant_id: p.product_variant.id,
    price_myr: Number(p.price_myr),
    observed_at: p.observed_at,
    store_id: p.store.id,
  }));
  const cheapest = currentCheapest(observations);
  const isCheapest = cheapest?.price_myr === Number(entry.price_myr) &&
    cheapest?.store_id === entry.store.id &&
    cheapest?.product_variant_id === entry.product_variant.id &&
    cheapest?.observed_at === entry.observed_at;

  // Photos: only if current user uploaded this entry.
  const photos =
    entry.contributor_id === user.id
      ? await loadPhotosForPriceEntry(supabase, id)
      : [];

  const product = entry.product_variant.product;
  const variantBits = variantBitsOf(entry.product_variant);
  const otherPrices = allPrices.filter((p) => p.id !== entry.id);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href="/search"
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
          Search cheapest
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {product.canonical_name}
        </h1>
        {variantBits.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {variantBits.join(" · ")}
          </p>
        )}
      </header>

      <PriceHero entry={entry} isCheapest={isCheapest} />

      {photos.length > 0 && <PhotoGrid photos={photos} />}

      {purchases.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold text-foreground">
            Your purchases of this product
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({purchases.length})
            </span>
          </h2>
          <ul className="space-y-2">
            {purchases.map((p) => {
              const verdict = compareToMarket({
                pricePaidMyr: Number(p.price_paid_myr),
                observations,
              });
              return (
                <li key={p.id}>
                  <Link
                    href={`/purchases/${p.id}`}
                    className="block rounded-lg border border-border bg-card p-3 hover:border-foreground/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground truncate">
                          {p.store.name}
                          {p.store.chain && (
                            <span className="text-muted-foreground">
                              {" · "}
                              {p.store.chain}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {dateFmt.format(new Date(p.purchased_at))}
                          {variantBitsOf(p.product_variant).length > 0 && (
                            <>
                              {" · "}
                              {variantBitsOf(p.product_variant).join(" · ")}
                            </>
                          )}
                        </div>
                        <div className="mt-2">
                          <VerdictBadge verdict={verdict} />
                        </div>
                      </div>
                      <div className="text-base font-semibold text-foreground tabular-nums shrink-0">
                        {myr.format(Number(p.price_paid_myr))}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {otherPrices.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold text-foreground">
            Other prices for this product
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({otherPrices.length})
            </span>
          </h2>
          <ul className="space-y-2">
            {otherPrices.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/prices/${p.id}`}
                  className="block rounded-lg border border-border bg-card p-3 hover:border-foreground/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground truncate">
                        {p.store.name}
                        {p.store.chain && (
                          <span className="text-muted-foreground">
                            {" · "}
                            {p.store.chain}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {variantBitsOf(p.product_variant).join(" · ") ||
                          "loose"}
                        {" · "}
                        {dateFmt.format(new Date(p.observed_at))}
                      </div>
                    </div>
                    <div className="text-base font-semibold text-foreground tabular-nums shrink-0">
                      {myr.format(Number(p.price_myr))}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PriceHero({
  entry,
  isCheapest,
}: {
  entry: PriceEntryRow;
  isCheapest: boolean;
}) {
  const tone = isCheapest
    ? "border-primary/40 bg-primary-soft/30"
    : "border-border bg-card";

  return (
    <section
      className={`rounded-xl border ${tone} p-5 shadow-sm`}
      aria-label="Price entry"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Listed price
          </span>
          {isCheapest && <Badge tone="primary">Best</Badge>}
        </div>
        <div className="text-xs text-muted-foreground shrink-0 text-right">
          Observed {dateFmt.format(new Date(entry.observed_at))}
        </div>
      </div>

      <div className="mt-1.5">
        <div className="text-base font-medium text-foreground break-words">
          {entry.store.name}
        </div>
        {entry.store.chain && (
          <div className="text-xs text-muted-foreground">
            {entry.store.chain}
          </div>
        )}
      </div>

      <div className="mt-2 text-3xl font-semibold text-foreground tabular-nums">
        {myr.format(Number(entry.price_myr))}
      </div>
      {entry.unit_price_per_100g !== null && (
        <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
          {myr.format(Number(entry.unit_price_per_100g))} / 100g
        </div>
      )}

      {entry.store.address && (
        <p className="mt-3 text-xs text-muted-foreground border-t border-border/60 pt-3">
          {entry.store.address}
        </p>
      )}

      {entry.notes && (
        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
          {entry.notes}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-3">
        <a
          href={googleMapsUrl(entry.store)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
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
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Open in Google Maps
        </a>
        <Link
          href={`/stores/${entry.store.id}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
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
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit store
        </Link>
      </div>
    </section>
  );
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (verdict.kind === "first_record") {
    return <Badge tone="neutral">First price recorded</Badge>;
  }
  if (verdict.kind === "cheaper") {
    return (
      <Badge tone="primary">
        {myr.format(verdict.deltaMyr)} cheaper than current best
      </Badge>
    );
  }
  if (verdict.kind === "match") {
    return <Badge tone="primary">Matches current best</Badge>;
  }
  return (
    <Badge tone="accent">
      {myr.format(verdict.deltaMyr)} more than current best
    </Badge>
  );
}

async function loadPhotosForPriceEntry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entryId: string,
): Promise<{ path: string; url: string }[]> {
  const evidenceQ = await supabase
    .from("price_entries")
    .select("id, evidence_paths")
    .eq("id", entryId)
    .maybeSingle()
    .returns<EvidenceRow>();
  if (evidenceQ.error || !evidenceQ.data) return [];

  const paths = (evidenceQ.data.evidence_paths ?? []).filter((p) =>
    IMAGE_EXT.test(p),
  );
  if (paths.length === 0) return [];

  const signed = await supabase.storage
    .from("receipts")
    .createSignedUrls(paths, 60 * 60);
  if (signed.error || !signed.data) return [];

  return signed.data
    .filter((row) => row.signedUrl && row.path)
    .map((row) => ({ path: row.path!, url: row.signedUrl! }));
}

function PhotoGrid({ photos }: { photos: { path: string; url: string }[] }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-sm font-semibold text-foreground">Photos</h2>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((p) => (
          <li
            key={p.path}
            className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
          >
            <a href={p.url} target="_blank" rel="noopener noreferrer">
              <Image
                src={p.url}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover hover:opacity-90 transition-opacity"
                unoptimized
              />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
