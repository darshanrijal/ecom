import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  LayersIcon,
  PackageIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface HeroProps {
  productCount: number;
  categoryCount: number;
}

export function Hero({ productCount, categoryCount }: HeroProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border bg-linear-to-br from-muted/70 via-background to-muted/40">
        <div className="relative z-10 grid items-center gap-8 p-6 sm:p-10 md:grid-cols-2 md:p-14">
          {/* Copy */}
          <div className="flex flex-col items-start gap-5">
            <Badge variant="outline" className="h-6 gap-1.5 px-3">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-orange-500"
              />
              Nepal&apos;s trusted electronics store
            </Badge>

            <h1 className="text-balance font-semibold text-3xl leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
              All the electronics your home needs.
            </h1>

            <p className="max-w-md text-muted-foreground text-sm leading-6 sm:text-base">
              Mobile phones, TVs, refrigerators, washing machines, ACs and more
              — genuine products, official warranty and the best after-sales
              service.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                nativeButton={false}
                render={
                  <Link href="/products">
                    Shop now
                    <ArrowRightIcon />
                  </Link>
                }
              />

              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link href="#categories">Browse categories</Link>}
              />
            </div>

            <div className="flex items-center gap-4 pt-1 text-muted-foreground text-xs sm:gap-6">
              <span className="flex items-center gap-1.5">
                <PackageIcon className="size-3.5" />
                {productCount} products
              </span>
              <span className="flex items-center gap-1.5">
                <LayersIcon className="size-3.5" />
                {categoryCount} categories
              </span>
            </div>
          </div>

          {/* Character art */}
          <div className="relative h-60 sm:h-80 md:aspect-4/3 md:h-auto">
            <div
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 size-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial from-orange-400/40 via-orange-500/15 to-transparent blur-2xl"
            />
            <div
              aria-hidden="true"
              className="absolute bottom-6 left-1/2 size-[72%] -translate-x-1/2 rounded-full bg-linear-to-b from-orange-100 via-orange-50 to-transparent ring-1 ring-orange-500/15 dark:from-orange-500/25 dark:via-orange-500/10"
            />
            <div
              aria-hidden="true"
              className="absolute bottom-3 left-1/2 h-4 w-[58%] -translate-x-1/2 rounded-full bg-black/20 blur-md"
            />
            <Image
              src="/jethalal.png"
              alt="Jethalal welcoming you to Gada Electronics"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 40vw"
              className="relative z-10 object-contain object-bottom drop-shadow-2xl"
            />

            <div className="absolute top-8 right-0 z-20 flex items-center gap-1.5 rounded-full border bg-background/90 px-3 py-1.5 font-medium text-xs shadow-lg backdrop-blur">
              <BadgeCheckIcon className="size-3.5 text-emerald-600" />
              Official warranty
            </div>
          </div>
        </div>

        {/* Brand lore strip */}
        <div className="relative z-10 border-t bg-background/60 px-6 py-3 text-center text-muted-foreground text-xs sm:px-10">
          Official dealer for Red Cerry 8400, RAMSUNG, MyPhone, SingSong &amp;
          TonyTV
        </div>
      </div>
    </section>
  );
}
