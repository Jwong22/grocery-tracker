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

type PurchaseRow = {
  id: string;
  price_paid_myr: number;
  qty: number;
  pack_size_g_at_purchase: number | null;
  purchased_at: string;
  notes: string | null;
  order_id: string | null;
  product_variant: VariantInfo & {
    product: { id: string; canonical_name: string; category: string | null };
  };
  store: {
    id: string;
    name: string;
    chain: string | null;
    address: string | null;
  };
};

type OrderSummary = {
  id: string;
  subtotal_myr: number;
  discount_myr: number;
  rounding_myr: number;
  total_myr: number;
};

type PriceEntryListing = {
  id: string;
  price_myr: number;
  observed_at: string;
  unit_price_per_100g: number | null;
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

export default async function PurchaseDetailPage({
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

  const purchaseQ = await supabase
    .from("purchases")
    .select(
      `id, price_paid_myr, qty, pack_size_g_at_purchase, purchased_at, notes, order_id,
       product_variant:product_variants!inner (
         id, brand, origin_country, pack_type, pack_size_g,
         product:products!inner ( id, canonical_name, category )
       ),
       store:stores!inner ( id, name, chain, address )`,
    )
    .eq("id", id)
    .maybeSingle()
    .returns<PurchaseRow>();

  if (purchaseQ.error) {
    throw new Error(`Could not load purchase: ${purchaseQ.error.message}`);
  }
  if (!purchaseQ.data) notFound();
  const purchase = purchaseQ.data;

  // If this purchase is part of an order (receipt), load the order summary.
  let order: OrderSummary | null = null;
  if (purchase.order_id) {
    const orderQ = await supabase
      .from("purchase_orders")
      .select("id, subtotal_myr, discount_myr, rounding_myr, total_myr")
      .eq("id", purchase.order_id)
      .maybeSingle()
      .returns<OrderSummary>();
    if (!orderQ.error) order = orderQ.data;
  }
  const productId = purchase.product_variant.product.id;
  const variantSelect = "id, brand, origin_country, pack_type, pack_size_g";

  const pricesQ = await supabase
    .from("price_entries")
    .select(
      `id, price_myr, observed_at, unit_price_per_100g,
       product_variant:product_variants!inner ( ${variantSelect}, product_id ),
       store:stores!inner ( id, name, chain )`,
    )
    .eq("product_variant.product_id", productId)
    .order("observed_at", { ascending: false })
    .returns<PriceEntryListing[]>();

  if (pricesQ.error) {
    throw new Error(`Could not load prices: ${pricesQ.error.message}`);
  }
  const prices = pricesQ.data ?? [];

  const observations = prices.map((p) => ({
    product_id: productId,
    product_variant_id: p.product_variant.id,
    price_myr: Number(p.price_myr),
    observed_at: p.observed_at,
    store_id: p.store.id,
  }));
  const cheapest = currentCheapest(observations);
  const cheapestRow = cheapest
    ? prices.find(
        (p) =>
          p.store.id === cheapest.store_id &&
          p.product_variant.id === cheapest.product_variant_id &&
          Number(p.price_myr) === cheapest.price_myr &&
          p.observed_at === cheapest.observed_at,
      )
    : null;
  const verdict = compareToMarket({
    pricePaidMyr: Number(purchase.price_paid_myr),
    observations,
  });

  // Photos for this specific purchase only.
  const photos = await loadPhotosForPurchase(supabase, id);

  const product = purchase.product_variant.product;
  const variantBits = variantBitsOf(purchase.product_variant);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href="/history"
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
          Purchase history
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

      <PurchaseHero purchase={purchase} verdict={verdict} />

      {order && (order.discount_myr > 0 || Number(order.rounding_myr) !== 0) && (
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">
            Part of a receipt
          </h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums text-foreground">
                {myr.format(Number(order.subtotal_myr))}
              </dd>
            </div>
            {order.discount_myr > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Coupon / discount</dt>
                <dd className="tabular-nums text-primary">
                  −{myr.format(Number(order.discount_myr))}
                </dd>
              </div>
            )}
            {Number(order.rounding_myr) !== 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Rounding</dt>
                <dd className="tabular-nums text-foreground">
                  {myr.format(Number(order.rounding_myr))}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border/60 pt-1 mt-1">
              <dt className="font-medium text-foreground">Total paid</dt>
              <dd className="tabular-nums font-semibold text-foreground">
                {myr.format(Number(order.total_myr))}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            This is one item from a receipt. The total above covers the whole
            receipt.
          </p>
        </section>
      )}

      {photos.length > 0 && <PhotoGrid photos={photos} />}

      {cheapest && cheapestRow && verdict.kind !== "match" && (
        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold text-foreground">
            {verdict.kind === "cheaper"
              ? "You beat the market"
              : "Cheaper option available"}
          </h2>
          <Link
            href={`/prices/${cheapestRow.id}`}
            className="block rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">
                  {cheapestRow.store.name}
                  {cheapestRow.store.chain && (
                    <span className="text-muted-foreground font-normal">
                      {" · "}
                      {cheapestRow.store.chain}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {variantBitsOf(cheapestRow.product_variant).join(" · ") ||
                    "Same product"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Observed {dateFmt.format(new Date(cheapestRow.observed_at))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-semibold text-foreground tabular-nums">
                  {myr.format(Number(cheapestRow.price_myr))}
                </div>
                {cheapestRow.unit_price_per_100g !== null && (
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {myr.format(Number(cheapestRow.unit_price_per_100g))} / 100g
                  </div>
                )}
              </div>
            </div>
          </Link>
        </section>
      )}

      {prices.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold text-foreground">
            All known prices
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({prices.length})
            </span>
          </h2>
          <ul className="space-y-2">
            {prices.map((p) => (
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

function PurchaseHero({
  purchase,
  verdict,
}: {
  purchase: PurchaseRow;
  verdict: Verdict;
}) {
  const tone =
    verdict.kind === "cheaper" || verdict.kind === "match"
      ? "border-primary/40 bg-primary-soft/30"
      : verdict.kind === "pricier"
        ? "border-accent/40 bg-accent-soft/30"
        : "border-border bg-card";

  return (
    <section
      className={`rounded-xl border ${tone} p-5 shadow-sm`}
      aria-label="Your purchase"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            You paid
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground tabular-nums">
            {myr.format(Number(purchase.price_paid_myr))}
          </div>
          {Number(purchase.qty) !== 1 && (
            <div className="text-xs text-muted-foreground mt-0.5">
              ×{Number(purchase.qty)} purchased
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-medium text-foreground">
            {purchase.store.name}
          </div>
          {purchase.store.chain && (
            <div className="text-xs text-muted-foreground">
              {purchase.store.chain}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            {dateFmt.format(new Date(purchase.purchased_at))}
          </div>
        </div>
      </div>

      {purchase.notes && (
        <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line border-t border-border/60 pt-3">
          {purchase.notes}
        </p>
      )}

      <div className="mt-4 border-t border-border/60 pt-3">
        <VerdictRow verdict={verdict} />
      </div>
    </section>
  );
}

function VerdictRow({ verdict }: { verdict: Verdict }) {
  if (verdict.kind === "first_record") {
    return (
      <p className="text-sm text-muted-foreground">
        First price recorded for this product — no comparison available yet.
      </p>
    );
  }
  if (verdict.kind === "cheaper") {
    return (
      <p className="text-sm text-foreground">
        <Badge tone="primary" className="mr-2">
          Cheaper
        </Badge>
        You saved {myr.format(verdict.deltaMyr)} vs the current best of{" "}
        <span className="font-medium tabular-nums">
          {myr.format(verdict.cheapestMyr)}
        </span>
        .
      </p>
    );
  }
  if (verdict.kind === "match") {
    return (
      <p className="text-sm text-foreground">
        <Badge tone="primary" className="mr-2">
          Best price
        </Badge>
        Matches the current cheapest known price (
        <span className="font-medium tabular-nums">
          {myr.format(verdict.cheapestMyr)}
        </span>
        ).
      </p>
    );
  }
  return (
    <p className="text-sm text-foreground">
      <Badge tone="accent" className="mr-2">
        Pricier
      </Badge>
      {myr.format(verdict.deltaMyr)} more than the current best of{" "}
      <span className="font-medium tabular-nums">
        {myr.format(verdict.cheapestMyr)}
      </span>
      .
    </p>
  );
}

async function loadPhotosForPurchase(
  supabase: Awaited<ReturnType<typeof createClient>>,
  purchaseId: string,
): Promise<{ path: string; url: string }[]> {
  // Migration 0004 adds evidence_paths; tolerate it being absent.
  const evidenceQ = await supabase
    .from("purchases")
    .select("id, evidence_paths")
    .eq("id", purchaseId)
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
      <h2 className="text-sm font-semibold text-foreground">Your photos</h2>
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
