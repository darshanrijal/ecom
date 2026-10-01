import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

interface ClosingCtaProps {
  productCount: number;
}

export function ClosingCta({ productCount }: ClosingCtaProps) {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border bg-primary px-6 py-12 text-primary-foreground sm:px-10 sm:py-14 lg:px-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -left-10 size-64 rounded-full bg-white/5 blur-3xl"
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl space-y-4">
              <h2 className="text-balance font-semibold text-3xl tracking-tight sm:text-4xl">
                Ready when you are.
              </h2>
              <p className="text-base text-primary-foreground/75 leading-relaxed">
                Browse {productCount} products across phones, entertainment, and
                home appliances. Pay with EMI, eSewa, Khalti, or cash on
                delivery.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                variant="secondary"
                nativeButton={false}
                render={
                  <Link href="/products">
                    Shop all products
                    <ArrowRightIcon />
                  </Link>
                }
              />
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                nativeButton={false}
                render={<Link href="/#categories">Browse categories</Link>}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
