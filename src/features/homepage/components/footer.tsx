import { cache } from "react";
import { db } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";

export const getNavCategories = cache(async () =>
  db.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  })
);

const quickLinks = [
  { label: "All products", url: "/products" },
  { label: "Top deals", url: "/#deals" },
  { label: "Shop by category", url: "/#categories" },
  { label: "Sign in", url: "/sign-in" },
  { label: "Create account", url: "/sign-up" },
];

const payments = ["Cash on Delivery", "eSewa", "Khalti", "Visa", "Mastercard"];

export async function Footer() {
  const categories = await getNavCategories();

  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="max-w-sm">
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <Image
                src="/logo.png"
                alt="Gada Electronics"
                width={40}
                height={40}
                className="size-10 object-contain"
              />
              <span className="font-semibold text-lg">Gada Electronics</span>
            </Link>

            <p className="mt-4 text-muted-foreground text-sm leading-6">
              Your one-stop electronics store for phones, appliances and home
              entertainment — with genuine products and after-sales service you
              can rely on.
            </p>

            <p className="mt-3 text-muted-foreground text-xs leading-5">
              Official dealer for Red Cerry 8400, RAMSUNG, MyPhone, SingSong
              &amp; TonyTV.
            </p>
          </div>

          {/* Categories */}
          <nav aria-label="Categories">
            <p className="mb-4 font-medium text-sm">Categories</p>
            <ul className="space-y-2.5">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/category/${category.slug}`}
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick links */}
          <nav aria-label="Quick links">
            <p className="mb-4 font-medium text-sm">Quick links</p>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.url}
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Payments / delivery */}
          <div>
            <p className="mb-4 font-medium text-sm">We accept</p>
            <div className="flex flex-wrap gap-2">
              {payments.map((payment) => (
                <span
                  key={payment}
                  className="rounded-lg border bg-background px-2.5 py-1.5 text-muted-foreground text-xs"
                >
                  {payment}
                </span>
              ))}
            </div>

            <div className="mt-5 rounded-xl border bg-background p-4">
              <p className="font-medium text-sm">Free delivery</p>
              <p className="mt-1 text-muted-foreground text-xs leading-5">
                Inside Kathmandu Valley on orders over Rs. 5,000. Nationwide
                delivery available at checkout.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-muted-foreground text-xs sm:flex-row">
          <p>
            © {new Date().getFullYear()} Gada Electronics. All rights reserved.
          </p>
          <p>Prices are in Nepalese Rupees (NPR) and include all taxes.</p>
        </div>
      </div>
    </footer>
  );
}
