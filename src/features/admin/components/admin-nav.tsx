"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products", exact: false },
  { href: "/admin/orders", label: "Orders", exact: false },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
      {NAV_LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
