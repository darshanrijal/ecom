"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCartIcon } from "lucide-react";

interface AddToCartButtonProps {
  skuId: string;
  disabled?: boolean;
}

export function AddToCartButton({ skuId, disabled }: AddToCartButtonProps) {
  const { addToCart } = useCart();

  function handleAddToCart() {
    addToCart({ skuId, quantity: 1 });
    toast.add({ title: "Added to cart", type: "success" });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={handleAddToCart}
      className="w-full"
    >
      <ShoppingCartIcon />
      Add to cart
    </Button>
  );
}
