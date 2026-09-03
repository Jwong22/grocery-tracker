import { redirect } from "next/navigation";

// Adding a purchase is now part of the unified "Add entry" form: record a
// price and tick "I bought this" to also log it as a purchase.
export default function AddPurchaseRedirect() {
  redirect("/add/price");
}
