import Link from "next/link";
import { PriceForm } from "./PriceForm";

export default function AddPricePage() {
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Record a price
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick a product and store, fill the price, and save. New products and
            stores can be created inline.
          </p>
        </div>
        <Link
          href="/add/price/batch"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
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
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Bulk import
        </Link>
      </header>
      <PriceForm />
    </div>
  );
}
