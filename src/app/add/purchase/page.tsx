import { PurchaseForm } from "./PurchaseForm";

export default function AddPurchasePage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">Log a purchase</h1>
        <p className="text-sm text-gray-600 mt-1">
          Record what you bought. We&rsquo;ll compare it against the shared
          price database to flag whether it was the cheapest available.
        </p>
      </header>
      <PurchaseForm />
    </div>
  );
}
