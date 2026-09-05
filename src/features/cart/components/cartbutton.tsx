"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { authClient } from "@/lib/auth-client";
import { ShoppingCartIcon } from "lucide-react";
import { CartItem } from "./cart-item";

export const CartButton = () => {
  const { items: cartItems, clearGuestCart, updateQuantity } = useCart();
  const { data: authData } = authClient.useSession();
  return (
    <Sheet>
      <SheetTrigger
        nativeButton={false}
        render={
          <div className="relative">
            <Button
              variant={"outline"}
              size={"icon"}
              className="relative rounded-full"
            >
              <ShoppingCartIcon />
            </Button>
            {cartItems.length !== 0 && (
              <Badge className="absolute -top-2 -right-4 rounded-full bg-orange-400">
                {cartItems.length}
              </Badge>
            )}
          </div>
        }
      />
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Your Cart</SheetTitle>
          <SheetDescription>
            Add, remove or update quantity of your cart items
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          {cartItems.map((item) => (
            <CartItem
              quantity={item.quantity}
              skuId={item.skuId}
              key={item.id}
              onDecrease={(skuId) =>
                updateQuantity(skuId, Math.max(1, item.quantity - 1))
              }
              onIncrease={(skuId) => updateQuantity(skuId, item.quantity + 1)}
            />
          ))}
        </div>
        {!authData?.session && cartItems.length !== 0 && (
          <Button onClick={() => clearGuestCart()}>Clear Cart</Button>
        )}
        {cartItems.length === 0 && (
          <p className="max-w-xs pl-10 text-muted-foreground">
            Your cart is empty. Add items to cart to show them here.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
};
