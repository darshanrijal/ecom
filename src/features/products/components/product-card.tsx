import type { RouterOutputs } from "@/__rpc/client";
import Link from "next/link";
import { ProductImage } from "./product-image";
import { cn } from "@/lib/utils";
import { AddToCartButton } from "./add-to-cart-btn";

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
  const originalPrice = Number(minPriceSku.originalPrice);
  const hasDiscount = originalPrice > price;

  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md",
        className
      )}
    >
      <Link
        href={`/product/${product.slug}`}
        className="absolute inset-0 z-10"
        aria-label={product.name}
      />

      <div className="flex flex-col gap-3">
        {/* Image Container */}
        <div
          className={cn(
            "relative aspect-square w-full overflow-hidden rounded-xl bg-muted",
            imageContainerClassName
          )}
        >
          <ProductImage
            alt={`Image for ${product.name}`}
            src={product.baseImage}
            className={cn(
              "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
              imageClassName
            )}
          />

          {hasDiscount && (
            <span className="absolute top-2 left-2 z-20 rounded-md bg-orange-500/40 px-2 py-1 font-semibold text-destructive-foreground text-xs">
              {discountPercentage}% OFF
            </span>
          )}
        </div>

        {/* Content */}
        <div className={cn("flex flex-col gap-1.5", contentClassName)}>
          <h3
            className={cn(
              "line-clamp-2 font-medium text-card-foreground text-sm transition-colors group-hover:text-primary",
              nameClassName
            )}
          >
            {product.name}
          </h3>

          <div
            className={cn("flex items-baseline gap-2 text-sm", priceClassName)}
          >
            <span className="font-bold text-foreground">
              NPR {price.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-muted-foreground text-xs line-through">
                NPR {originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-20 mt-4">
        <AddToCartButton
          className="w-full"
          productId={product.id}
          productName={product.name}
        />
      </div>
    </div>
  );
};
