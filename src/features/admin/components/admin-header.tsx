"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon, PackageSearchIcon, StoreIcon } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/features/admin/components/theme-toggle";

const titles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/orders": "Orders",
  "/admin/products": "Products",
  "/admin/settings": "Settings",
};

export function AdminHeader() {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Admin";

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b bg-background/95 backdrop-blur">
      <div className="flex flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                render={
                  <Link href="/admin">
                    <StoreIcon className="-mt-0.5 size-3.5" />
                    Admin
                  </Link>
                }
              >
                Admin
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-foreground">
                {title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-1 px-4">
        <div className="relative hidden md:block">
          <PackageSearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            className="w-56 rounded-full pl-8"
            aria-label="Search"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          aria-label="Notifications"
        >
          <BellIcon className="size-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
