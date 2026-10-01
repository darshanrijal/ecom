import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ModeToggle } from "@/components/mode-toggle";
import { UserButton } from "@/features/auth/components/userbutton";
import { CartButton } from "@/features/cart/components/cartbutton";
import { getCurrentSession } from "@/lib/auth";
import { MenuIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DesktopNav } from "./desktop-nav";
import { getNavCategories } from "./footer";
import { SearchBar } from "./search-bar";

export const Navbar = async () => {
  const [categories, session] = await Promise.all([
    getNavCategories(),
    getCurrentSession(),
  ]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8"
      >
        <div className="flex shrink-0 items-center gap-1 lg:gap-2">
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    data-slot="sheet-trigger"
                    size="icon"
                    variant="ghost"
                    aria-label="Open menu"
                  >
                    <MenuIcon />
                  </Button>
                }
              />

              <SheetContent side="left" className="w-80 gap-0 p-0">
                <SheetHeader className="border-b px-4 py-4 text-left">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>

                <div className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      nativeButton={false}
                      className="justify-start"
                      render={<Link href="/products">All products</Link>}
                    />
                    <Button
                      variant="ghost"
                      nativeButton={false}
                      className="justify-start"
                      render={<Link href="/#deals">Deals</Link>}
                    />
                    {!!session?.user && (
                      <>
                        <Button
                          variant="ghost"
                          nativeButton={false}
                          className="justify-start"
                          render={<Link href="/orders">Orders</Link>}
                        />
                        <Button
                          variant="ghost"
                          nativeButton={false}
                          className="justify-start"
                          render={<Link href="/favorites">Favorites</Link>}
                        />
                      </>
                    )}
                  </div>

                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 px-3 font-medium text-muted-foreground text-xs">
                      Shop by category
                    </p>
                    <div className="flex flex-col gap-0.5">
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
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Link
            href="/"
            className="flex shrink-0 items-center transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo.png"
              alt="Gada Electronics"
              width={48}
              height={48}
              className="size-10 object-contain sm:size-11"
              priority
            />
          </Link>

          <DesktopNav categories={categories} />
        </div>

        <SearchBar className="mx-auto" />

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <ModeToggle />
          <UserButton />
          <CartButton />
        </div>
      </nav>
    </header>
  );
};
