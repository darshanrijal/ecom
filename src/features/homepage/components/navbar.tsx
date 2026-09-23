import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserButton } from "@/features/auth/components/userbutton";
import { CartButton } from "@/features/cart/components/cartbutton";
import { ChevronDownIcon, MenuIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getNavCategories } from "./footer";
import { SearchProductsButton } from "./search-products-button";

const navbarLinks = [
  {
    label: "Shop",
    url: "/products",
  },
  {
    label: "Top deals",
    url: "/#deals",
  },
  {
    label: "Orders",
    url: "/orders",
  },
];

export const Navbar = async () => {
  const categories = await getNavCategories();

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
                  size="icon-sm"
                  variant="outline"
                  aria-label="Open menu"
                >
                  <MenuIcon />
                </Button>
              }
            />

            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-1 overflow-y-auto">
                {navbarLinks.map((link) => (
                  <Button
                    key={link.label}
                    variant="ghost"
                    nativeButton={false}
                    className="justify-start"
                    render={<Link href={link.url}>{link.label}</Link>}
                  />
                ))}

                <p className="mt-3 mb-1 px-3 font-medium text-muted-foreground text-xs uppercase">
                  Categories
                </p>

                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant="ghost"
                    nativeButton={false}
                    className="justify-start"
                    render={
                      <Link href={`/category/${category.slug}`}>
                        {category.name}
                      </Link>
                    }
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
            className="size-12 object-contain sm:size-14"
            priority
          />
          <span className="ms-2 hidden font-semibold text-base sm:block">
            Gada Electronics
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center rounded-full border bg-muted/60 p-1 shadow-sm md:flex">
          {navbarLinks.map((link) => (
            <Link
              key={link.label}
              href={link.url}
              className="rounded-full px-5 py-2 font-medium text-muted-foreground text-sm transition-all duration-200 hover:bg-background hover:text-foreground hover:shadow-sm"
            >
              {link.label}
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full px-5 py-2 font-medium text-muted-foreground text-sm transition-all duration-200 hover:bg-background hover:text-foreground hover:shadow-sm"
                >
                  Categories
                  <ChevronDownIcon className="size-3.5" />
                </button>
              }
            />

            <DropdownMenuContent align="center" className="max-h-80 w-56">
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category.id}
                  render={
                    <Link href={`/category/${category.slug}`}>
                      {category.name}
                    </Link>
                  }
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
