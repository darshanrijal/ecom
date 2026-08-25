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
import { ShoppingCartIcon } from "lucide-react";

export const CartButton = () => {
  const { items } = useCart();
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
      </SheetContent>
    </Sheet>
  );
};
