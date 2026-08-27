import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "./ThemeToggle";
import { NavLinks } from "./NavLinks";
import { NavMenu } from "./NavMenu";

export async function TopNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const links = [
    { href: "/", label: "Home" },
    { href: "/search", label: "Search" },
    { href: "/add/price", label: "+ Price" },
    { href: "/add/purchase", label: "+ Purchase" },
    { href: "/stores", label: "Stores" },
    { href: "/history", label: "History" },
    { href: "/analytics", label: "Spending" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <nav className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
        <Link
          href="/"
          aria-label="HooYe home"
          className="flex items-center gap-2 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src="/hooye-icon.png"
            alt=""
            width={952}
            height={876}
            priority
            className="h-8 w-8 rounded-lg shadow-sm ring-1 ring-border"
          />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            HooYe
          </span>
        </Link>
        <div className="hidden lg:flex flex-1 min-w-0 items-center gap-3">
          <NavLinks links={links} />
        </div>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <div className="hidden sm:block lg:hidden">
            <NavMenu links={links} />
          </div>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </nav>
    </header>
  );
}
