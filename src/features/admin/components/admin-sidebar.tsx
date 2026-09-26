"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  ChevronsUpDownIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingCartIcon,
  StoreIcon,
  TagsIcon,
  UserIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LucideIcon } from "lucide-react";

interface SidebarNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const overview: SidebarNavItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboardIcon },
];

const management: SidebarNavItem[] = [
  { title: "Orders", url: "/admin/orders", icon: ShoppingCartIcon },
  { title: "Products", url: "/admin/products", icon: PackageIcon },
  { title: "Categories", url: "/admin/categories", icon: TagsIcon },
];

const account: SidebarNavItem[] = [
  { title: "Settings", url: "/admin/settings", icon: SettingsIcon },
];

function SidebarLink({ item }: { item: SidebarNavItem }) {
  const pathname = usePathname();
  const isActive =
    item.url === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(item.url);

  return (
    <SidebarMenuButton
      tooltip={item.title}
      isActive={isActive}
      render={
        <Link href={item.url}>
          <item.icon />
          <span>{item.title}</span>
        </Link>
      }
    />
  );
}

export function AdminSidebar() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const displayName = user?.name ?? "Admin";
  const displayEmail = user?.email ?? "";
  const initials =
    displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AD";

  const signOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 overflow-hidden px-1 py-1 group-data-[collapsible=icon]:justify-center">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">
            <StoreIcon className="size-4" />
          </span>
          <div className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <p className="font-semibold text-sm">Gada Electronics</p>
            <p className="text-muted-foreground text-xs">Admin Console</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarMenu>
            {overview.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarLink item={item} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarMenu>
            {management.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarLink item={item} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarMenu>
            {account.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarLink item={item} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="h-auto w-full justify-start gap-2 overflow-hidden px-2 py-1.5 group-data-[collapsible=icon]:justify-center [&_svg]:size-4"
              >
                <Avatar className="size-8">
                  <AvatarImage
                    src={user?.image ?? undefined}
                    alt={displayName}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium text-sm">
                    {displayName}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {displayEmail}
                  </span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </Button>
            }
          />
          <DropdownMenuContent side="top" align="center" className="w-56">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={
                <Link href="/">
                  <StoreIcon className="size-4" />
                  View store
                </Link>
              }
            >
              View store
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <Link href="/settings">
                  <UserIcon className="size-4" />
                  Profile
                </Link>
              }
            >
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 dark:text-red-400"
              onClick={signOut}
            >
              <LogOutIcon className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
