import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import { computeTotals, purchaseToItem, type SpendItem } from "@/lib/analytics/spending";

const myr = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("en-MY", {
  month: "short",
  day: "numeric",
});

type RecentVariant = {
  brand: string | null;
  origin_country: string | null;
  pack_type: string;
  pack_size_g: number | string | null;
  product: { canonical_name: string } | null;
};

type RecentPriceRow = {
  id: string;
  price_myr: number;
  observed_at: string;
  product_variant: RecentVariant | null;
  store: { name: string; chain: string | null } | null;
};

type RecentPurchaseRow = {
  id: string;
  price_paid_myr: number;
  qty: number;
  purchased_at: string;
  order_id: string | null;
  product_variant: RecentVariant | null;
  store: { name: string; chain: string | null } | null;
};

function variantBits(v: RecentVariant): string[] {
  return [
    v.brand,
    v.origin_country,
    v.pack_size_g ? `${Number(v.pack_size_g)}g` : null,
    v.pack_type !== "loose" ? v.pack_type : null,
  ].filter((b): b is string => Boolean(b));
}

type Tile = {
  href: string;
  title: string;
  desc: string;
  tone: "primary" | "info" | "accent" | "violet";
  icon: React.ReactNode;
};

const toneStyles: Record<Tile["tone"], string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  accent: "bg-accent-soft text-accent-soft-foreground",
  violet: "bg-violet-soft text-violet-soft-foreground",
};

const SearchIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
const ListIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);
const PlusIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const ChartIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M3 3v18h18" />
    <rect x="7" y="10" width="3" height="7" />
    <rect x="12" y="6" width="3" height="11" />
    <rect x="17" y="13" width="3" height="4" />
  </svg>
);
const CartIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M3 3h2l2.7 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6" />
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
  </svg>
);

const priceTiles: Tile[] = [
  {
    href: "/search",
    title: "Search cheapest",
    desc: "Find the lowest price near you, travel-cost adjusted.",
    tone: "primary",
    icon: SearchIcon,
  },
  {
    href: "/prices",
    title: "Browse all prices",
    desc: "See every price you've logged across stores.",
    tone: "info",
    icon: ListIcon,
  },
  {
    href: "/add/price",
    title: "Add a price",
    desc: "Record a price you spotted — manual, photo, or bulk import.",
    tone: "info",
    icon: PlusIcon,
  },
];

const spendingTiles: Tile[] = [
  {
    href: "/history",
    title: "Spending & history",
    desc: "Totals, charts, and every purchase in one place.",
    tone: "violet",
    icon: ChartIcon,
  },
  {
    href: "/add/purchase",
    title: "Log a purchase",
    desc: "Record what you bought — we'll flag the cheapest deal.",
    tone: "accent",
    icon: CartIcon,
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const greetingName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "there";

  const [pricesRes, purchasesRes, ordersRes] = await Promise.all([
    supabase
      .from("price_entries")
      .select(
        `id, price_myr, observed_at,
         product_variant:product_variants!inner (
           brand, origin_country, pack_type, pack_size_g,
           product:products!inner ( canonical_name )
         ),
         store:stores!inner ( name, chain )`,
      )
      .order("observed_at", { ascending: false })
      .limit(3)
      .returns<RecentPriceRow[]>(),
    supabase
      .from("purchases")
      .select(
        `id, price_paid_myr, qty, purchased_at, order_id,
         product_variant:product_variants!inner (
           brand, origin_country, pack_type, pack_size_g,
           product:products!inner ( canonical_name )
         ),
         store:stores!inner ( name, chain )`,
      )
      .order("purchased_at", { ascending: false })
      .returns<RecentPurchaseRow[]>(),
    supabase
      .from("purchase_orders")
      .select("total_myr, purchased_at")
      .returns<{ total_myr: number; purchased_at: string }[]>(),
  ]);

  const recentPrices = pricesRes.data ?? [];
  const allPurchases = purchasesRes.data ?? [];
  const allOrders = ordersRes.data ?? [];
  const recentPurchases = allPurchases.slice(0, 3);

  // Month total = order totals (coupon-aware) + purchases not in an order.
  const spendItems: SpendItem[] = [
    ...allOrders.map((o) => ({
      purchasedAt: o.purchased_at,
      amount: Number(o.total_myr),
    })),
    ...allPurchases
      .filter((p) => p.order_id == null)
      .map((p) =>
        purchaseToItem({
          purchasedAt: p.purchased_at,
          pricePaidMyr: Number(p.price_paid_myr),
          qty: Number(p.qty),
        }),
      ),
  ];
  const monthTotal = computeTotals(spendItems).month;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {greetingName} <span aria-hidden="true">👋</span>
        </h1>
      </header>

      {/* Primary quick actions — the two things you do most */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/add/purchase"
          className="group flex items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft/40 p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground shrink-0">
            {CartIcon}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-foreground">
              Record a purchase
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Something you bought — tracks your spending.
            </span>
          </span>
        </Link>

        <Link
          href="/add/price"
          className="group flex items-center gap-3 rounded-xl border border-primary/40 bg-primary-soft/40 p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground shrink-0">
            {PlusIcon}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-foreground">
              Record a price
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              A price you spotted — for future comparison.
            </span>
          </span>
        </Link>
      </div>

      {/* ===================== PRICES ===================== */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Compare & find deals"
          title="Prices"
          desc="Track what things cost across stores so you always know where's cheapest."
        />
        <TileGrid tiles={priceTiles} />

        <div className="flex items-center justify-between pt-1">
          <h3 className="text-sm font-medium text-muted-foreground">
            Recent prices
          </h3>
          {recentPrices.length > 0 && (
            <Link href="/prices" className="text-sm text-primary hover:underline">
              View all
            </Link>
          )}
        </div>
        {recentPrices.length === 0 ? (
          <EmptyHint>
            No prices logged yet. Start with{" "}
            <a className="text-primary hover:underline" href="/add/price">
              Add a price
            </a>
            .
          </EmptyHint>
        ) : (
          <ul className="space-y-2.5">
            {recentPrices.map((r) => {
              const v = r.product_variant;
              const name = v?.product?.canonical_name ?? "Unknown item";
              const bits = v ? variantBits(v) : [];
              return (
                <PreviewCard
                  key={r.id}
                  href={`/prices/${r.id}`}
                  name={name}
                  bits={bits}
                  store={r.store}
                  amount={myr.format(Number(r.price_myr))}
                  date={dateFmt.format(new Date(r.observed_at))}
                />
              );
            })}
          </ul>
        )}
      </section>

      {/* ===================== SPENDING ===================== */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Your money"
          title="Spending"
          desc="Record what you actually buy and see where your money goes."
        />

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Spent this month</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {myr.format(monthTotal)}
          </div>
        </div>

        <TileGrid tiles={spendingTiles} />

        <div className="flex items-center justify-between pt-1">
          <h3 className="text-sm font-medium text-muted-foreground">
            Recent purchases
          </h3>
          {recentPurchases.length > 0 && (
            <Link href="/history" className="text-sm text-primary hover:underline">
              View all
            </Link>
          )}
        </div>
        {recentPurchases.length === 0 ? (
          <EmptyHint>
            Nothing bought yet. Start with{" "}
            <a className="text-primary hover:underline" href="/add/purchase">
              Log a purchase
            </a>
            .
          </EmptyHint>
        ) : (
          <ul className="space-y-2.5">
            {recentPurchases.map((p) => {
              const v = p.product_variant;
              const name = v?.product?.canonical_name ?? "Unknown item";
              const bits = v ? variantBits(v) : [];
              return (
                <PreviewCard
                  key={p.id}
                  href={`/purchases/${p.id}`}
                  name={name}
                  bits={bits}
                  store={p.store}
                  amount={myr.format(Number(p.price_paid_myr))}
                  date={dateFmt.format(new Date(p.purchased_at))}
                  qty={Number(p.qty)}
                />
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Tip: install this app from your browser&rsquo;s share menu to get a
        home-screen icon.
      </p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}

function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {tiles.map((t) => (
        <li key={t.href}>
          <Link
            href={t.href}
            className="group block rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                  toneStyles[t.tone],
                )}
              >
                {t.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">{t.title}</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {t.desc}
                </div>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function PreviewCard({
  href,
  name,
  bits,
  store,
  amount,
  date,
  qty,
}: {
  href: string;
  name: string;
  bits: string[];
  store: { name: string; chain: string | null } | null;
  amount: string;
  date: string;
  qty?: number;
}) {
  return (
    <li className="relative rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-primary/30">
      <Link
        href={href}
        className="absolute inset-0 rounded-xl"
        aria-label={`View ${name}`}
      />
      <div className="relative flex items-start justify-between gap-3 pointer-events-none">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground truncate">{name}</div>
          {bits.length > 0 && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {bits.join(" · ")}
            </div>
          )}
          {store && (
            <div className="text-sm text-foreground mt-1.5 truncate">
              {store.name}
              {store.chain ? (
                <span className="text-muted-foreground">
                  {" · "}
                  {store.chain}
                </span>
              ) : null}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-0.5">{date}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-semibold text-foreground tabular-nums">
            {amount}
          </div>
          {qty !== undefined && qty !== 1 && (
            <div className="text-xs text-muted-foreground">×{qty}</div>
          )}
        </div>
      </div>
    </li>
  );
}
