// Pure spending-analytics helpers. No I/O, no framework — easy to unit test.
//
// A "spend item" is a pre-computed amount at a point in time. Callers decide
// how the amount is derived: an order's total_myr (coupon-aware) or, for a
// standalone purchase not attached to an order, price_paid_myr * qty. Dates are
// bucketed by the calendar day/month of the given Date instances.

/** Generic spend event: an amount at a timestamp. */
export type SpendItem = {
  /** ISO timestamp string. */
  purchasedAt: string;
  /** Amount spent (already coupon-adjusted where applicable). */
  amount: number;
};

/**
 * Back-compat shape for a standalone purchase. Convert with
 * {@link purchaseToItem} to feed the analytics helpers.
 */
export type SpendPurchase = {
  purchasedAt: string;
  pricePaidMyr: number;
  qty: number;
};

/** Turn a standalone purchase into a SpendItem (price * qty). */
export function purchaseToItem(p: SpendPurchase): SpendItem {
  const price = Number(p.pricePaidMyr);
  const qtyRaw = Number(p.qty);
  const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
  return {
    purchasedAt: p.purchasedAt,
    amount: Number.isFinite(price) ? price * qty : 0,
  };
}

export type Totals = {
  today: number;
  month: number;
  year: number;
  all: number;
};

export type SeriesPoint = {
  /** Bucket key, e.g. "2026-08-27" (day) or "2026-08" (month). */
  key: string;
  /** Human label for the axis, e.g. "27" or "Aug". */
  label: string;
  /** Summed spend in the bucket. */
  amount: number;
};

function lineTotal(p: SpendItem): number {
  const amt = Number(p.amount);
  return Number.isFinite(amt) ? amt : 0;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Totals for today, this month, this year, and all-time relative to `now`. */
export function computeTotals(
  items: SpendItem[],
  now: Date = new Date(),
): Totals {
  const totals: Totals = { today: 0, month: 0, year: 0, all: 0 };
  for (const p of items) {
    const d = new Date(p.purchasedAt);
    if (Number.isNaN(d.getTime())) continue;
    const amt = lineTotal(p);
    totals.all += amt;
    if (d.getFullYear() === now.getFullYear()) {
      totals.year += amt;
      if (d.getMonth() === now.getMonth()) {
        totals.month += amt;
        if (sameDay(d, now)) totals.today += amt;
      }
    }
  }
  return totals;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Daily spend for the calendar month containing `now` (one point per day). */
export function dailySeriesForMonth(
  items: SpendItem[],
  now: Date = new Date(),
): SeriesPoint[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const buckets = new Array<number>(daysInMonth).fill(0);
  for (const p of items) {
    const d = new Date(p.purchasedAt);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    buckets[d.getDate() - 1] += lineTotal(p);
  }

  return buckets.map((amount, i) => {
    const day = i + 1;
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return { key: `${year}-${mm}-${dd}`, label: String(day), amount };
  });
}

/** Monthly spend for the calendar year containing `now` (12 points). */
export function monthlySeriesForYear(
  items: SpendItem[],
  now: Date = new Date(),
): SeriesPoint[] {
  const year = now.getFullYear();
  const buckets = new Array<number>(12).fill(0);
  for (const p of items) {
    const d = new Date(p.purchasedAt);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getFullYear() !== year) continue;
    buckets[d.getMonth()] += lineTotal(p);
  }

  return buckets.map((amount, i) => {
    const mm = String(i + 1).padStart(2, "0");
    return { key: `${year}-${mm}`, label: MONTH_LABELS[i], amount };
  });
}
