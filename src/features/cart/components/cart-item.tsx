"use client";

import type { RouterOutputs } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/features/products/components/product-image";
import { MinusIcon, PlusIcon, TrashIcon } from "lucide-react";
import Link from "next/link";

type CartSku = RouterOutputs["products"]["getSKUsByIds"][number];

interface CartItemProps {
  sku: CartSku;
  quantity: number;
  onIncrease: (skuId: string) => void;
  onDecrease: (skuId: string) => void;
  onRemove: (skuId: string) => void;
}

export const CartItem = ({
  sku,
  quantity,
  onIncrease,
  onDecrease,
  onRemove,
}: CartItemProps) => {
  const variantText = sku.optionValues
    .map((ov) => `${ov.option.name}: ${ov.value}`)
    .join(" · ");

  const unitPrice = Number(sku.price);
  const lineTotal = unitPrice * quantity;
  const atMaxStock = quantity >= sku.stock;

  return (
    <div className="flex gap-3 border-b py-4 last:border-b-0">
      <Link
        href={`/product/${sku.product.slug}`}
        className="size-16 shrink-0 overflow-hidden rounded-lg border bg-muted/40"
        aria-label={sku.product.name}
      >
        <ProductImage
          alt={sku.product.name}
          src={sku.imageUrl}
          className="h-full w-full"
          imageClassName="rounded-none object-contain"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="line-clamp-2 font-medium text-sm leading-snug">
              {sku.product.name}
            </p>

            {variantText && (
              <p className="mt-0.5 text-muted-foreground text-xs">
                {variantText}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            title="Remove from cart"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(sku.id)}
          >
            <TrashIcon />
          </Button>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex h-8 items-center overflow-hidden rounded-lg border">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => onDecrease(sku.id)}
              disabled={quantity <= 1}
              className="flex h-full items-center justify-center px-2 text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MinusIcon className="size-3" />
            </button>

            <span className="w-7 text-center font-medium text-xs tabular-nums">
              {quantity}
            </span>

            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => onIncrease(sku.id)}
              disabled={atMaxStock}
              className="flex h-full items-center justify-center px-2 text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PlusIcon className="size-3" />
            </button>
          </div>

          <div className="text-right">
            <p className="font-semibold text-sm">
              Rs. {lineTotal.toLocaleString()}
            </p>

            {quantity > 1 && (
              <p className="text-[11px] text-muted-foreground">
                Rs. {unitPrice.toLocaleString()} each
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
