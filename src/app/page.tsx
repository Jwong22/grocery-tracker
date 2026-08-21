import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

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

      <p className="text-xs text-muted-foreground">
        Tip: install this app from your browser&rsquo;s share menu to get a
        home-screen icon.
      </p>
    </div>
  );
}
