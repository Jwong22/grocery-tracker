import { redirect } from "next/navigation";

// Spending analytics now live on the combined /history page.
export default function AnalyticsRedirect() {
  redirect("/history");
}
