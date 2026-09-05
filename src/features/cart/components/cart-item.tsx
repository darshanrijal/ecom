"use client";

import { trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ProductImage } from "@/features/products/components/product-image";
import { useCart } from "@/hooks/use-cart";
import { Minus, Plus, TrashIcon } from "lucide-react"; // Or whatever icon library you use

interface CartItemProps {
  quantity: number;
  skuId: string;
  onIncrease: (skuId: string) => void;
  onDecrease: (skuId: string) => void;
}

export const CartItem = ({
  quantity,
  skuId,
  onIncrease,
  onDecrease,
}: CartItemProps) => {
  const {
    data: sku,
    isPending,
    error,
  } = trpc.products.getProductBySKU.useQuery({ skuId });

  const { removeItemFromCart } = useCart();
  if (error) {
    toast.add({ type: "error", description: error.message });
    return null;
  }

  if (isPending) {
    return <Skeleton className="h-24 w-full rounded-md" />;
  }

  const variantText = sku.optionValues
    .map((ov) => `${ov.option.name}: ${ov.value}`)
    .join(" | ");

  const unitPrice = Number(sku.price);
  const totalPrice = (unitPrice * quantity).toFixed(2);

  return (
    <div className="flex flex-row items-center gap-4 border-b py-4">
      <ProductImage
        alt={sku.product.name}
        src={sku.imageUrl}
        className="size-20 shrink-0 rounded-md object-cover"
      />

      <div className="flex min-h-20 grow flex-col justify-between">
        <div className="self-end">
          <Button
            variant={"destructive"}
            size={"icon-sm"}
            type="button"
            title="Remove from cart"
            onClick={() => removeItemFromCart(skuId)}
          >
            <TrashIcon />
          </Button>
        </div>
        {/* Top half: Name and Variant */}
        <div>
          <h4 className="line-clamp-2 font-medium text-sm leading-tight">
            {sku.product.name}
          </h4>
          {variantText && (
            <p className="mt-1 text-gray-500 text-xs">{variantText}</p>
          )}
        </div>

        {/* Bottom half: Quantity Controls and Price */}
        <div className="mt-2 flex items-end justify-between">
          <div className="flex items-center rounded-md border">
            <button
              onClick={() => onDecrease(skuId)}
              disabled={quantity <= 1}
              className="p-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              aria-label="Decrease quantity"
            >
              <Minus className="size-3" />
            </button>

            <span className="w-8 px-3 text-center font-medium text-xs">
              {quantity}
            </span>

            <button
              type="button"
              onClick={() => onIncrease(skuId)}
              disabled={quantity >= sku.stock}
              className="p-1.5 disabled:opacity-50"
              aria-label="Increase quantity"
            >
              <Plus className="size-3" />
            </button>
          </div>

          <div className="font-semibold text-sm">Rs. {totalPrice}</div>
        </div>
      </div>
    </div>
  );
};
