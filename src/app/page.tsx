import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const tiles = [
  {
    href: "/search",
    title: "Search cheapest",
    desc: "Find the lowest price near you, travel-cost adjusted.",
    accent: "bg-green-50 text-green-800 border-green-200",
  },
  {
    href: "/add/price",
    title: "Record a price",
    desc: "Manual, photo, PDF, or Excel — multiple at once.",
    accent: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    href: "/add/purchase",
    title: "Log a purchase",
    desc: "We'll flag whether you got the cheapest deal.",
    accent: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    href: "/history",
    title: "Purchase history",
    desc: "Review past buys and how they compared.",
    accent: "bg-purple-50 text-purple-800 border-purple-200",
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

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-gray-500">Welcome back,</p>
        <h1 className="text-2xl font-semibold text-gray-900">
          {greetingName} 👋
        </h1>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tiles.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className={`block rounded-xl border p-4 hover:shadow-sm transition ${t.accent}`}
            >
              <div className="font-medium">{t.title}</div>
              <div className="text-sm opacity-80 mt-1">{t.desc}</div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-xs text-gray-400 pt-4">
        Tip: install this app from your browser&rsquo;s share menu to get a
        home-screen icon.
      </p>
    </div>
  );
}
