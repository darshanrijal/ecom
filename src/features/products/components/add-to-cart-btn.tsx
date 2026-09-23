"use client";

import { trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ProductImage } from "@/features/products/components/product-image";
import { StockBadge } from "@/features/products/components/stock-badge";
import { VariantChips } from "@/features/products/components/variant-chips";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import { ShoppingCartIcon } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";

type ButtonProps = React.ComponentProps<typeof Button>;

interface AddToCartButtonProps {
  skuId?: string;
  disabled?: boolean;
  productName: string;
  productId: string;
  className?: string;
  quantity?: number;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

export function AddToCartButton({
  skuId,
  disabled,
  productName,
  productId,
  className,
  quantity = 1,
  variant = "outline",
  size = "sm",
}: AddToCartButtonProps) {
  const { addToCart } = useCart();

  const [open, setOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(
    {}
  );

  const { data, isLoading } = trpc.products.getProductVariants.useQuery(
    { productId },
    {
      enabled: !skuId && open,
    }
  );

  const options = data?.options ?? [];
  const skus = data?.skus ?? [];

  const selectedSku = useMemo(() => {
    if (!options.length) {
      return;
    }

    if (Object.keys(selectedValues).length !== options.length) {
      return;
    }

    return skus.find((sku) =>
      options.every((option) => {
        const selectedValue = selectedValues[option.id];

        return sku.optionValues.some(
          (optionValue) =>
            optionValue.optionId === option.id &&
            optionValue.id === selectedValue
        );
      })
    );
  }, [options, skus, selectedValues]);

  const startingPrice = useMemo(() => {
    if (!skus.length) {
      return null;
    }

    return Math.min(...skus.map((sku) => sku.price));
  }, [skus]);

  function handleValueSelect(optionId: string, valueId: string) {
    setSelectedValues((current) => ({
      ...current,
      [optionId]: valueId,
    }));
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // SKU is already selected.
    if (skuId) {
      addToCart({ skuId, quantity });

      toast.add({
        title: "Added to cart",
        type: "success",
        description: `${quantity} × ${productName}`,
      });

      return;
    }

    // No SKU selected yet, so let the user choose one.
    setOpen(true);
  }

  function handleVariantAddToCart() {
    if (!selectedSku) {
      return;
    }

    if (selectedSku.stock <= 0) {
      toast.add({
        title: "Out of stock",
        type: "error",
      });

      return;
    }

    addToCart({
      skuId: selectedSku.id,
      quantity,
    });

    toast.add({
      title: "Added to cart",
      type: "success",
      description: `${quantity} × ${productName}`,
    });

    setOpen(false);
  }

  const price = selectedSku ? Number(selectedSku.price) : null;
  const originalPrice = selectedSku
    ? Number(selectedSku.originalPrice ?? 0)
    : 0;
  const hasDiscount = price !== null && originalPrice > price;
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  function getCtaLabel() {
    if (price === null) {
      return "Add to cart";
    }

    if (selectedSku && selectedSku.stock <= 0) {
      return "Out of stock";
    }

    return `Add to cart · Rs. ${(price * quantity).toLocaleString()}`;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={handleAddToCart}
        className={cn("w-full", className)}
      >
        <ShoppingCartIcon />
        Add to cart
      </Button>

      {!skuId && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
            {/* Product header */}
            <div className="flex items-center gap-4 border-b py-4 pr-12 pl-5">
              <div className="size-16 shrink-0 overflow-hidden rounded-lg border bg-muted/40">
                <ProductImage
                  alt={productName}
                  src={selectedSku?.imageUrl ?? skus[0]?.imageUrl}
                  className="h-full w-full"
                  imageClassName="rounded-none object-contain"
                />
              </div>

              <div className="min-w-0">
                <DialogTitle className="text-base">
                  Choose your options
                </DialogTitle>

                <DialogDescription className="mt-1 line-clamp-1">
                  {productName}
                </DialogDescription>
              </div>
            </div>

            {/* Options */}
            <div className="max-h-[45vh] space-y-5 overflow-y-auto px-5 py-5">
              {isLoading ? (
                <div className="space-y-5" aria-busy="true">
                  {[0, 1].map((i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <div className="flex gap-2">
                        <Skeleton className="h-9 w-28 rounded-full" />
                        <Skeleton className="h-9 w-20 rounded-full" />
                        <Skeleton className="h-9 w-24 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <VariantChips
                  options={options}
                  skus={skus}
                  selectedValues={selectedValues}
                  onSelect={handleValueSelect}
                />
              )}
            </div>

            {/* Price summary */}
            <div className="border-t bg-muted/40 px-5 py-4">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">
                    {selectedSku ? "Price" : "Starting at"}
                  </p>

                  <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                    <span className="font-bold text-lg">
                      Rs.{" "}
                      {(selectedSku
                        ? Number(selectedSku.price)
                        : (startingPrice ?? 0)
                      ).toLocaleString()}
                    </span>

                    {!!hasDiscount && (
                      <span className="text-muted-foreground text-sm line-through">
                        Rs. {originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {hasDiscount && price !== null && (
                    <p className="mt-0.5 font-medium text-emerald-600 text-xs">
                      You save {discountPercentage}% (Rs.{" "}
                      {(originalPrice - price).toLocaleString()})
                    </p>
                  )}
                </div>

                {selectedSku && (
                  <StockBadge
                    stock={selectedSku.stock}
                    className="mb-1 shrink-0"
                  />
                )}
              </div>
            </div>

            {/* Sticky CTA */}
            <div className="space-y-2 border-t px-5 py-4">
              <Button
                size="lg"
                className="w-full"
                disabled={!selectedSku || selectedSku.stock <= 0}
                onClick={handleVariantAddToCart}
              >
                <ShoppingCartIcon />
                {getCtaLabel()}
              </Button>

              {!isLoading && !selectedSku && options.length > 0 && (
                <p className="text-center text-muted-foreground text-xs">
                  Select{" "}
                  {options
                    .map((option) => option.name.toLowerCase())
                    .join(" and ")}{" "}
                  to continue
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
