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
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* for mobile */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  data-slot="sheet-trigger"
                  size={"icon-xs"}
                  variant={"outline"}
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
                    variant={"link"}
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
          className="flex items-center transition-opacity hover:opacity-80"
        >
          <Image
            src="/logo.png"
            alt="Gada Electronics"
            width={64}
            height={64}
            className="object-contain"
            priority
          />
        </Link>

        {/* Navigation */}
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
        <div className="flex items-center gap-2">
          <div className="rounded-full border bg-background p-1 shadow-sm transition-shadow hover:shadow-md">
            <UserButton />
          </div>

          <div className="rounded-full border bg-background p-1 shadow-sm transition-shadow hover:shadow-md">
            <CartButton />
          </div>
        </div>
      </div>
    </nav>
  );
};
