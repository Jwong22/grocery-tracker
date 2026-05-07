import Link from "next/link";
import { PriceForm } from "./PriceForm";

export default function AddPricePage() {
  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Record a price</h1>
          <p className="text-sm text-gray-600 mt-1">
            Pick a product and store, fill the price, and save. New products and
            stores can be created inline.
          </p>
        </div>
        <Link
          href="/add/price/batch"
          className="shrink-0 rounded-full border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-50"
        >
          📷 Bulk import
        </Link>
      </header>
      <PriceForm />
    </div>
  );
}
