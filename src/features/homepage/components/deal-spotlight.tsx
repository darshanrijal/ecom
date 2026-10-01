import type { RouterOutputs } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/features/products/components/add-to-cart-btn";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type DealProduct = RouterOutputs["products"]["getHomeData"]["deals"][number];

interface DealSpotlightProps {
  deal: DealProduct;
}

function formatPrice(value: number) {
  return `NPR ${value.toLocaleString("en-NP")}`;
}

export function DealSpotlight({ deal }: DealSpotlightProps) {
  const [sku] = deal.productSKUs;
  if (!sku) {
    return null;
  }

  const price = Number(sku.price);
  const originalPrice = Number(sku.originalPrice ?? 0);
  const savings = originalPrice > price ? originalPrice - price : 0;
  const outOfStock = sku.stock <= 0;

  return (
    <section id="deals" className="scroll-mt-28 border-b py-12 sm:py-16">
      <div className="mx-auto grid w-full max-w-7xl items-stretch gap-0 overflow-hidden rounded-2xl border bg-card px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="relative aspect-square overflow-hidden bg-muted lg:aspect-auto lg:min-h-[28rem]">
          <Image
            src={deal.baseImage}
            alt={deal.name}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col justify-center gap-6 py-8 lg:px-10 lg:py-12">
          <div className="space-y-3">
            <p className="font-medium text-destructive text-sm">
              {deal.discount}% off
              {!!deal.category?.name && (
                <span className="text-muted-foreground">
                  {" "}
                  · {deal.category.name}
                </span>
              )}
            </p>
            <h2 className="text-balance font-semibold text-3xl tracking-tight sm:text-4xl">
              {deal.name}
            </h2>
            {!!deal.description && (
              <p className="max-w-[48ch] text-muted-foreground text-sm leading-relaxed sm:text-base">
                {deal.description.length > 160
                  ? `${deal.description.slice(0, 157).trimEnd()}...`
                  : deal.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold text-2xl tabular-nums">
              {formatPrice(price)}
            </span>
            {savings > 0 && (
              <>
                <span className="text-base text-muted-foreground tabular-nums line-through">
                  {formatPrice(originalPrice)}
                </span>
                <span className="font-medium text-emerald-700 text-sm dark:text-emerald-400">
                  Save {formatPrice(savings)}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AddToCartButton
              productId={deal.id}
              productName={deal.name}
              disabled={outOfStock}
              size="lg"
              className="min-w-40"
            />
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={
                <Link href={`/product/${deal.slug}`}>
                  View details
                  <ArrowRightIcon />
                </Link>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
