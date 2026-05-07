import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

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
    { href: "/history", label: "History" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
      <nav className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3 overflow-x-auto">
        <Link href="/" className="font-semibold text-green-700 shrink-0">
          🛒 Grocer
        </Link>
        <ul className="flex items-center gap-3 text-sm flex-1 min-w-0">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="text-gray-700 hover:text-green-700 whitespace-nowrap"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <SignOutButton />
      </nav>
    </header>
  );
}
