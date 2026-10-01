"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

export interface NavCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

interface DesktopNavProps {
  categories: NavCategory[];
}

export function DesktopNav({ categories }: DesktopNavProps) {
  return (
    <NavigationMenu className="hidden lg:flex" align="start">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="h-9 bg-transparent px-3">
            Shop
          </NavigationMenuTrigger>
          <NavigationMenuContent className="p-3">
            <div className="w-[34rem]">
              <div className="mb-2 flex items-center justify-between px-2">
                <p className="font-medium text-sm">Categories</p>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                >
                  All products
                  <ArrowRightIcon className="size-3" />
                </Link>
              </div>

              <ul className="grid grid-cols-2 gap-1">
                {categories.map((category) => (
                  <li key={category.id}>
                    <NavigationMenuLink
                      render={
                        <Link
                          href={`/category/${category.slug}`}
                          className="flex flex-col items-start gap-0.5 rounded-md p-3"
                        >
                          <span className="font-medium text-sm">
                            {category.name}
                          </span>
                          {!!category.description && (
                            <span className="line-clamp-1 text-muted-foreground text-xs leading-relaxed">
                              {category.description}
                            </span>
                          )}
                        </Link>
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            render={<Link href="/#deals">Deals</Link>}
          />
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            render={<Link href="/products">Catalog</Link>}
          />
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
