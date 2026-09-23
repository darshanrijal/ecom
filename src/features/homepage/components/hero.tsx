import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, LayersIcon, PackageIcon } from "lucide-react";
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
                className="size-1.5 rounded-full bg-green-500"
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
          <div className="relative hidden aspect-4/3 md:block">
            <div
              aria-hidden="true"
              className="absolute inset-x-10 top-4 bottom-0 rounded-full bg-primary/10 blur-3xl"
            />
            <Image
              src="/jethalal.png"
              alt="Jethalal welcoming you to Gada Electronics"
              fill
              priority
              sizes="(max-width: 768px) 0vw, 40vw"
              className="relative z-10 object-contain object-bottom drop-shadow-xl"
            />
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
