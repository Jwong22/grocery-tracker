"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type NavLink = { href: string; label: string };

const linkBase =
  "inline-flex items-center px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-0.5 sm:gap-1 flex-1 min-w-0 overflow-x-auto -mx-2 px-2">
      {links.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <li key={l.href} className="shrink-0">
            <Link
              href={l.href}
              className={cn(
                linkBase,
                active
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
              aria-current={active ? "page" : undefined}
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
