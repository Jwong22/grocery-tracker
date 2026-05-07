import { createClient } from "@/lib/supabase/server";
import {
  compareToMarket,
  fetchPriceObservationsForVariants,
  type Verdict,
} from "@/lib/purchase/compareToMarket";

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

  const { data: rawPurchases, error } = await supabase
    .from("purchases")
    .select(
      `id, price_paid_myr, qty, pack_size_g_at_purchase, purchased_at, notes,
       product_variant:product_variants!inner (
         id, brand, origin_country, pack_type, pack_size_g,
         product:products!inner ( id, canonical_name )
       ),
       store:stores!inner ( id, name, chain )`,
    )
    .order("purchased_at", { ascending: false })
    .limit(100)
    .returns<PurchaseRow[]>();

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-gray-900">
          Purchase history
        </h1>
        <p className="text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const purchases = rawPurchases ?? [];
  const variantIds = [
    ...new Set(purchases.map((p) => p.product_variant.id)),
  ];
  const observations = await fetchPriceObservationsForVariants(
    supabase,
    variantIds,
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">
          Purchase history
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Comparison checks against price entries within ±30 days of each
          purchase.
        </p>
      </header>

      {purchases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          Nothing logged yet. Add one from{" "}
          <a className="text-amber-700 underline" href="/add/purchase">
            Log a purchase
          </a>
          .
        </div>
      ) : (
        <ul className="space-y-2">
          {purchases.map((p) => {
            const verdict = compareToMarket({
              variantId: p.product_variant.id,
              pricePaidMyr: Number(p.price_paid_myr),
              purchasedAt: p.purchased_at,
              observations,
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
    <li className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 truncate">
            {purchase.product_variant.product.canonical_name}
          </div>
          {variantBits.length > 0 && (
            <div className="text-xs text-gray-500 truncate">
              {variantBits.join(" · ")}
            </div>
          )}
          <div className="text-sm text-gray-700 mt-1 truncate">
            {purchase.store.name}
            {purchase.store.chain ? ` · ${purchase.store.chain}` : ""}
          </div>
          <div className="text-xs text-gray-400">
            {new Date(purchase.purchased_at).toLocaleDateString()}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-semibold text-gray-900 tabular-nums">
            {myr.format(purchase.price_paid_myr)}
          </div>
          {purchase.qty !== 1 && (
            <div className="text-xs text-gray-500">×{purchase.qty}</div>
          )}
        </div>
      </div>
      <VerdictBadge verdict={verdict} />
    </li>
  );
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (verdict.kind === "first_record") {
    return (
      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
        🆕 First price recorded
      </div>
    );
  }
  if (verdict.kind === "cheapest") {
    return (
      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
        ✅ Cheapest known
      </div>
    );
  }
  return (
    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
      💰 {myr.format(verdict.deltaMyr)} more than cheapest (
      {myr.format(verdict.cheapestMyr)})
    </div>
  );
}
