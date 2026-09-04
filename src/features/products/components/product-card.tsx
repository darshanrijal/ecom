import type { RouterOutputs } from "@/__rpc/client";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
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
    <Link href={`/product/${product.slug}`}>
      <article
        className={cn(
          "group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-md",
          className
        )}
      >
        {/* Image */}
        <div
          className={cn(
            "relative aspect-square w-full overflow-hidden bg-muted/30",
            imageContainerClassName
          )}
        >
          <Image
            src={product.baseImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              "object-contain transition-transform duration-300",
              "group-hover:scale-105",
              imageClassName
            )}
          />
        </div>

        {/* Content */}
        <div className={cn("flex flex-col gap-1 p-4", contentClassName)}>
          <h3
            className={cn(
              "truncate font-medium text-foreground text-sm leading-5",
              nameClassName
            )}
            title={product.name}
          >
            {product.name}
          </h3>

          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={cn(
                "font-bold text-lg text-orange-500",
                priceClassName
              )}
            >
              Rs. {price.toLocaleString()}
            </span>

            {hasDiscount && (
              <span className="text-muted-foreground text-xs line-through">
                Rs. {originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          <span
            className={cn(
              "mt-1 font-medium text-xs",
              hasDiscount ? "text-orange-500" : "text-muted-foreground"
            )}
          >
            {hasDiscount ? `${discountPercentage}% off` : "Best value"}
          </span>
          {/** biome-ignore lint/a11y/noNoninteractiveElementInteractions: one timee */}
          {/** biome-ignore lint/a11y/noStaticElementInteractions: one timee */}
          {/** biome-ignore lint/a11y/useKeyWithClickEvents: one timee */}
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="self-end"
          >
            <AddToCartButton
              productName={product.name}
              productId={product.id}
            />
          </div>
        </div>
      </article>
    </Link>
  );
};
