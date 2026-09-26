import type { RouterOutputs } from "@/__rpc/client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { AddToCartButton } from "./add-to-cart-btn";
import { ProductImage } from "./product-image";
import { StockBadge } from "./stock-badge";

interface ProductCardProps {
  product: RouterOutputs["products"]["getAllProducts"]["products"][number];
  className?: string;
  imageClassName?: string;
  imageContainerClassName?: string;
  contentClassName?: string;
  nameClassName?: string;
  priceClassName?: string;
}

export const ProductCard = ({
  product,
  className,
  imageClassName,
  imageContainerClassName,
  contentClassName,
  nameClassName,
  priceClassName,
}: ProductCardProps) => {
  const [minPriceSku] = product.productSKUs;

  if (!minPriceSku) {
    return null;
  }

  const price = Number(minPriceSku.price);
  const originalPrice = Number(minPriceSku.originalPrice ?? 0);
  const hasDiscount = originalPrice > price;

  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const outOfStock = minPriceSku.stock <= 0;
  const lowStock = !outOfStock && minPriceSku.stock <= 5;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-md",
        className
      )}
    >
      <div
        className={cn(
          "relative aspect-square w-full overflow-hidden bg-muted",
          imageContainerClassName
        )}
      >
        <Link
          href={`/product/${product.slug}`}
          className="absolute inset-0 z-10"
          aria-label={product.name}
        />

        <ProductImage
          alt={`Image for ${product.name}`}
          src={product.baseImage}
          className={cn(
            "h-full w-full transition-transform duration-300 group-hover:scale-105",
            imageClassName
          )}
          imageClassName="rounded-none object-cover h-full w-full"
        />

        {hasDiscount && (
          <span className="absolute top-3 left-3 z-20 rounded-md bg-destructive px-2 py-0.5 font-semibold text-[11px] text-white tracking-wide">
            {discountPercentage}% OFF
          </span>
        )}

        {outOfStock && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60">
            <span className="rounded-full border bg-card px-3 py-1 font-medium text-xs shadow-sm">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* product details */}
      <div
        className={cn(
          "flex flex-1 flex-col justify-between gap-3 p-4",
          contentClassName
        )}
      >
        <div className="flex flex-col gap-1.5">
          <Link href={`/product/${product.slug}`}>
            <p
              className={cn(
                "font-bold text-base text-foreground",
                nameClassName
              )}
            >
              {product.name}
            </p>
          </Link>
          <div
            className={cn(
              "flex flex-wrap items-baseline gap-x-2 gap-y-1",
              priceClassName
            )}
          >
            <span className="text-base text-foreground">
              NPR {price.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-muted-foreground text-xs line-through">
                NPR {originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          {!!(hasDiscount || lowStock) && (
            <div className="flex items-center justify-between gap-2">
              {hasDiscount && (
                <p className="font-medium text-emerald-600 text-xs">
                  Save NPR {(originalPrice - price).toLocaleString()}
                </p>
              )}
              {!!lowStock && <StockBadge stock={minPriceSku.stock} />}
            </div>
          )}
        </div>

        <AddToCartButton
          className="relative z-20 w-full"
          productId={product.id}
          productName={product.name}
          disabled={outOfStock}
        />
      </div>
    </div>
  );
};
