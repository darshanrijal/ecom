import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserButton } from "@/features/auth/components/userbutton";
import { CartButton } from "@/features/cart/components/cartbutton";
import { MenuIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SearchProductsButton } from "./search-products-button";

const navbarLinks = [
  {
    label: "Services",
    url: "/services",
  },
  {
    label: "About",
    url: "/about",
  },
  {
    label: "Contact",
    url: "/contact",
  },
];

export const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
        {/* Mobile menu */}
        <div className="shrink-0 md:hidden">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  data-slot="sheet-trigger"
                  size="icon-xs"
                  variant="outline"
                >
                  <MenuIcon />
                </Button>
              }
            />

            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Other links</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-4">
                {navbarLinks.map((link) => (
                  <Button
                    key={link.label}
                    variant="link"
                    nativeButton={false}
                    render={<Link href={link.url}>{link.label}</Link>}
                  />
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo */}
        <Link
          href="/"
          className="flex min-w-0 shrink items-center transition-opacity hover:opacity-80"
        >
          <Image
            src="/logo.png"
            alt="Gada Electronics"
            width={64}
            height={64}
            className="size-14 object-contain sm:size-16"
            priority
          />
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center rounded-full border bg-muted/60 p-1 shadow-sm md:flex">
          {navbarLinks.map((link) => (
            <Link
              key={link.label}
              href={link.url}
              className="rounded-full px-6 py-2.5 font-medium text-muted-foreground text-sm transition-all duration-200 hover:bg-background hover:text-foreground hover:shadow-sm"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <SearchProductsButton />

          {/* User */}
          <div className="hidden shrink-0 rounded-full border bg-background p-1 shadow-sm transition-shadow hover:shadow-md lg:block">
            <UserButton />
          </div>

          {/* Cart */}
          <div className="shrink-0 rounded-full border bg-background p-1 shadow-sm transition-shadow hover:shadow-md">
            <CartButton />
          </div>
        </div>
      </div>
    </nav>
  );
};
