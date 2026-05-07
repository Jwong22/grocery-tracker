import { PurchaseForm } from "./PurchaseForm";

export default function AddPurchasePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Log a purchase
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record what you bought. We&rsquo;ll compare it against the shared
          price database to flag whether it was the cheapest available.
        </p>
      </header>
      <PurchaseForm />
    </div>
  );
}
