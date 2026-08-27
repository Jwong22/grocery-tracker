import { createClient } from "@/lib/supabase/server";
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
  price_paid_myr: number;
  qty: number;
  purchased_at: string;
  order_id: string | null;
};

type OrderRow = {
  total_myr: number;
  purchased_at: string;
};

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Spending = order totals (coupon-aware) + standalone purchases not in an order.
  const [ordersRes, purchasesRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("total_myr, purchased_at")
      .returns<OrderRow[]>(),
    supabase
      .from("purchases")
      .select("price_paid_myr, qty, purchased_at, order_id")
      .is("order_id", null)
      .returns<PurchaseRow[]>(),
  ]);

  const error = ordersRes.error ?? purchasesRes.error;
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

  const orderItems: SpendItem[] = (ordersRes.data ?? []).map((o) => ({
    purchasedAt: o.purchased_at,
    amount: Number(o.total_myr),
  }));
  const looseItems: SpendItem[] = (purchasesRes.data ?? []).map((p) =>
    purchaseToItem({
      purchasedAt: p.purchased_at,
      pricePaidMyr: Number(p.price_paid_myr),
      qty: Number(p.qty),
    }),
  );
  const items: SpendItem[] = [...orderItems, ...looseItems];

  const now = new Date();
  const totals = computeTotals(items, now);
  const daily = dailySeriesForMonth(items, now);
  const monthly = monthlySeriesForYear(items, now);

  const hasAny = items.length > 0;

  const monthName = MONTH_NAMES[now.getMonth()];
  const year = now.getFullYear();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Spending
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Totals and trends across everything you&rsquo;ve logged.
        </p>
      </header>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Today" value={myr.format(totals.today)} />
        <StatCard label="This month" value={myr.format(totals.month)} />
        <StatCard label="This year" value={myr.format(totals.year)} />
        <StatCard label="All time" value={myr.format(totals.all)} muted />
      </div>

      {/* Daily chart */}
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

      {/* Monthly chart */}
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

      {!hasAny && (
        <p className="text-sm text-muted-foreground">
          Nothing logged yet. Add one from{" "}
          <a className="text-primary hover:underline" href="/add/purchase">
            Log a purchase
          </a>
          .
        </p>
      )}
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
