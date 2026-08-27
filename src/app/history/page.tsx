import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  compareToMarket,
  fetchPriceObservationsForProducts,
  type Verdict,
} from "@/lib/purchase/compareToMarket";
import {
  computeTotals,
  dailySeriesForMonth,
  monthlySeriesForYear,
  purchaseToItem,
  type SpendItem,
} from "@/lib/analytics/spending";
import { BarChart } from "@/components/charts/BarChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const myr = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

type OrderRow = {
  total_myr: number;
  purchased_at: string;
};

export default async function SpendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [purchasesRes, ordersRes] = await Promise.all([
    supabase
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
      .returns<PurchaseRow[]>(),
    supabase
      .from("purchase_orders")
      .select("total_myr, purchased_at")
      .returns<OrderRow[]>(),
  ]);

  const error = purchasesRes.error ?? ordersRes.error;
  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Spending
        </h1>
        <p className="text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  const purchases = purchasesRes.data ?? [];
  const orders = ordersRes.data ?? [];

  // Coupon-aware spend items: order totals + purchases NOT in an order.
  const items: SpendItem[] = [
    ...orders.map((o) => ({
      purchasedAt: o.purchased_at,
      amount: Number(o.total_myr),
    })),
    ...purchases
      .filter((p) => p.order_id == null)
      .map((p) =>
        purchaseToItem({
          purchasedAt: p.purchased_at,
          pricePaidMyr: Number(p.price_paid_myr),
          qty: Number(p.qty),
        }),
      ),
  ];

  const now = new Date();
  const totals = computeTotals(items, now);
  const daily = dailySeriesForMonth(items, now);
  const monthly = monthlySeriesForYear(items, now);
  const monthName = MONTH_NAMES[now.getMonth()];
  const year = now.getFullYear();

  // Market comparison for the purchase list.
  const productIds = [
    ...new Set(purchases.map((p) => p.product_variant.product.id)),
  ];
  const observations = await fetchPriceObservationsForProducts(
    supabase,
    productIds,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Spending
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your totals, trends, and every purchase — coupons included.
        </p>
      </header>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Today" value={myr.format(totals.today)} />
        <StatCard label="This month" value={myr.format(totals.month)} />
        <StatCard label="This year" value={myr.format(totals.year)} />
        <StatCard label="All time" value={myr.format(totals.all)} muted />
      </div>

      {/* Charts */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Daily spend — {monthName} {year}
            </CardTitle>
            <CardDescription>
              One bar per day this month. Hover a bar for the amount.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={daily} labelEvery={5} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly spend — {year}</CardTitle>
            <CardDescription>
              One bar per month this year. Hover a bar for the amount.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={monthly} />
          </CardContent>
        </Card>
      </div>

      {/* Purchase list */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Purchase history
        </h2>
        {purchases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              >
                <path d="M3 3h2l2.7 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6" />
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">
              Nothing logged yet. Add one from{" "}
              <a className="text-primary hover:underline" href="/add/purchase">
                Log a purchase
              </a>
              .
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
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={
            muted
              ? "mt-1 text-xl font-semibold tabular-nums text-muted-foreground"
              : "mt-1 text-xl font-semibold tabular-nums text-foreground"
          }
        >
          {value}
        </div>
      </CardContent>
    </Card>
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
