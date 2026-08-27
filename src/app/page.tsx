import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

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

const tiles: Tile[] = [
  {
    href: "/search",
    title: "Search cheapest",
    desc: "Find the lowest price near you, travel-cost adjusted.",
    tone: "primary",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
  },
  {
    href: "/add/price",
    title: "Add entry",
    desc: "Record a price or purchase — manual, photo, or bulk import.",
    tone: "info",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    href: "/add/purchase",
    title: "Quick purchase",
    desc: "Log a buy — we'll flag if you got the cheapest deal.",
    tone: "accent",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M3 3h2l2.7 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6" />
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
      </svg>
    ),
  },
  {
    href: "/history",
    title: "Purchase history",
    desc: "Review past buys and how they compared.",
    tone: "violet",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
];

const toneStyles: Record<Tile["tone"], string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  accent: "bg-accent-soft text-accent-soft-foreground",
  violet: "bg-violet-soft text-violet-soft-foreground",
};

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

  const { data: recentData } = await supabase
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
    .limit(5)
    .returns<RecentPriceRow[]>();

  const recent = recentData ?? [];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {greetingName} <span aria-hidden="true">👋</span>
        </h1>
      </header>

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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Recent prices
          </h2>
          {recent.length > 0 && (
            <Link
              href="/prices"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No prices logged yet. Add one from{" "}
              <a className="text-primary hover:underline" href="/add/price">
                Add entry
              </a>
              .
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {recent.map((r) => {
              const v = r.product_variant;
              const name = v?.product?.canonical_name ?? "Unknown item";
              const bits = v ? variantBits(v) : [];
              return (
                <li
                  key={r.id}
                  className="relative rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-primary/30"
                >
                  <Link
                    href={`/prices/${r.id}`}
                    className="absolute inset-0 rounded-xl"
                    aria-label={`View price entry for ${name}`}
                  />
                  <div className="relative flex items-start justify-between gap-3 pointer-events-none">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">
                        {name}
                      </div>
                      {bits.length > 0 && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {bits.join(" · ")}
                        </div>
                      )}
                      {r.store && (
                        <div className="text-sm text-foreground mt-1.5 truncate">
                          {r.store.name}
                          {r.store.chain ? (
                            <span className="text-muted-foreground">
                              {" · "}
                              {r.store.chain}
                            </span>
                          ) : null}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {dateFmt.format(new Date(r.observed_at))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-semibold text-foreground tabular-nums">
                        {myr.format(Number(r.price_myr))}
                      </div>
                    </div>
                  </div>
                </li>
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
