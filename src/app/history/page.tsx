import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  compareToMarket,
  fetchPriceObservationsForProducts,
  type Verdict,
} from "@/lib/purchase/compareToMarket";
import { Badge } from "@/components/ui/Badge";

const myr = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
});

type PurchaseRow = {
  id: string;
  price_paid_myr: number;
  qty: number;
  pack_size_g_at_purchase: number | null;
  purchased_at: string;
  notes: string | null;
  order_id: string | null;
  product_variant: {
    id: string;
    brand: string | null;
    origin_country: string | null;
    pack_type: string;
    pack_size_g: number | null;
    product: { id: string; canonical_name: string };
  };
  store: { id: string; name: string; chain: string | null };
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("purchases")
    .select(
      `id, price_paid_myr, qty, pack_size_g_at_purchase, purchased_at, notes, order_id,
       product_variant:product_variants!inner (
         id, brand, origin_country, pack_type, pack_size_g,
         product:products!inner ( id, canonical_name )
       ),
       store:stores!inner ( id, name, chain )`,
    )
    .order("purchased_at", { ascending: false })
    .limit(200)
    .returns<PurchaseRow[]>();

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Purchase history
        </h1>
        <p className="text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  const purchases = data ?? [];
  const productIds = [
    ...new Set(purchases.map((p) => p.product_variant.product.id)),
  ];
  const observations = await fetchPriceObservationsForProducts(
    supabase,
    productIds,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Purchase history
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything you&rsquo;ve bought. See{" "}
          <Link href="/analytics" className="text-primary hover:underline">
            Spending
          </Link>{" "}
          for totals and charts.
        </p>
      </header>

      {purchases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing logged yet. Add one from{" "}
            <a className="text-primary hover:underline" href="/add/price">
              Add entry
            </a>{" "}
            and tick &ldquo;I bought this&rdquo;.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {purchases.map((p) => {
            const productObs = observations.filter(
              (o) => o.product_id === p.product_variant.product.id,
            );
            const verdict = compareToMarket({
              pricePaidMyr: Number(p.price_paid_myr),
              observations: productObs,
            });
            return <PurchaseCard key={p.id} purchase={p} verdict={verdict} />;
          })}
        </ul>
      )}
    </div>
  );
}

function PurchaseCard({
  purchase,
  verdict,
}: {
  purchase: PurchaseRow;
  verdict: Verdict;
}) {
  const variantBits = [
    purchase.product_variant.brand,
    purchase.product_variant.origin_country,
    purchase.product_variant.pack_size_g
      ? `${purchase.product_variant.pack_size_g}g`
      : null,
    purchase.product_variant.pack_type !== "loose"
      ? purchase.product_variant.pack_type
      : null,
  ].filter(Boolean);

  return (
    <li className="relative rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-primary/30">
      <Link
        href={`/purchases/${purchase.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={`View purchase of ${purchase.product_variant.product.canonical_name}`}
      />
      <div className="relative flex items-start justify-between gap-3 pointer-events-none">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground truncate">
            {purchase.product_variant.product.canonical_name}
          </div>
          {variantBits.length > 0 && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {variantBits.join(" · ")}
            </div>
          )}
          <div className="text-sm text-foreground mt-1.5 truncate">
            {purchase.store.name}
            {purchase.store.chain ? (
              <span className="text-muted-foreground">
                {" · "}
                {purchase.store.chain}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {new Date(purchase.purchased_at).toLocaleDateString()}
            {purchase.order_id ? " · part of a receipt" : ""}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-semibold text-foreground tabular-nums">
            {myr.format(purchase.price_paid_myr)}
          </div>
          {purchase.qty !== 1 && (
            <div className="text-xs text-muted-foreground">×{purchase.qty}</div>
          )}
        </div>
      </div>
      <div className="relative mt-2.5 pointer-events-none">
        <VerdictBadge verdict={verdict} />
      </div>
    </li>
  );
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (verdict.kind === "first_record") {
    return <Badge tone="neutral">First price recorded</Badge>;
  }
  if (verdict.kind === "cheaper") {
    return (
      <Badge tone="primary">
        {myr.format(verdict.deltaMyr)} cheaper than current best (
        {myr.format(verdict.cheapestMyr)})
      </Badge>
    );
  }
  if (verdict.kind === "match") {
    return (
      <Badge tone="primary">
        Matches current best ({myr.format(verdict.cheapestMyr)})
      </Badge>
    );
  }
  return (
    <Badge tone="accent">
      {myr.format(verdict.deltaMyr)} more than current best (
      {myr.format(verdict.cheapestMyr)})
    </Badge>
  );
}
