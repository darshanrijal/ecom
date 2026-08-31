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

export const CartButton = () => {
  const { items, clearGuestCart } = useCart();
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
            {items.length !== 0 && (
              <Badge className="absolute -top-2 -right-4 rounded-full bg-orange-400">
                {items.length}
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
        <div>
          {items.map((item) => (
            <p key={item.id}>{item.skuId}</p>
          ))}
        </div>
        {!authData?.session && items.length !== 0 && (
          <Button onClick={() => clearGuestCart()}>Clear Cart</Button>
        )}
        {items.length === 0 && (
          <p className="max-w-xs pl-10 text-muted-foreground">
            Your cart is empty. Add items to cart to show them here.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
};
