"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCartSkus } from "@/hooks/use-cart-skus";
import { ShoppingCartIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CartItem } from "./cart-item";

export const CartButton = () => {
  const {
    cart,
    lines: resolvedItems,
    totalCount,
    resolvedCount,
    subtotal,
    isError,
    refetch,
  } = useCartSkus();
  const {
    items: cartItems,
    clearCart,
    updateQuantity,
    removeItemFromCart,
  } = cart;
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
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
            {totalCount !== 0 && (
              <Badge className="absolute -top-2 -right-4 rounded-full bg-orange-400 text-white">
                {totalCount}
              </Badge>
            )}
          </div>
        }
      />
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4 pr-12">
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            {cartItems.length === 0
              ? "Add, remove or update quantity of your cart items"
              : `${cartItems.length} ${cartItems.length === 1 ? "item" : "items"} in your bag`}
          </SheetDescription>
        </SheetHeader>

        {cartItems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <ShoppingCartIcon className="size-6 text-muted-foreground" />
            </div>

            <p className="font-medium text-sm">Your cart is empty</p>

            <p className="max-w-xs text-muted-foreground text-sm">
              Browse the catalog and add something you like — it will show up
              right here.
            </p>

            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link href="/products" onNavigate={() => setSheetOpen(false)}>
                  Start shopping
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5">
              {resolvedItems.map(({ item, sku }) =>
                sku ? (
                  <CartItem
                    key={item.id}
                    sku={sku}
                    quantity={item.quantity}
                    onIncrease={(skuId) =>
                      updateQuantity(
                        skuId,
                        Math.min(item.quantity + 1, sku.stock)
                      )
                    }
                    onDecrease={(skuId) =>
                      updateQuantity(skuId, Math.max(1, item.quantity - 1))
                    }
                    onRemove={(skuId) => removeItemFromCart(skuId)}
                  />
                ) : (
                  <div key={item.id} className="flex gap-3 border-b py-4">
                    <Skeleton className="size-16 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-2 pt-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-8 w-28" />
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="shrink-0 space-y-3 border-t px-5 py-4">
              {!!isError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                  <p className="font-medium text-destructive text-xs">
                    Couldn&apos;t load some cart items.
                  </p>

                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-1 text-destructive text-xs underline underline-offset-2"
                  >
                    Try again
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">
                    Subtotal · {resolvedCount}{" "}
                    {resolvedCount === 1 ? "item" : "items"}
                  </p>

                  <p className="font-semibold text-lg">
                    Rs. {subtotal.toLocaleString()}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => clearCart()}
                >
                  Clear cart
                </Button>
              </div>

              <Button
                className="w-full"
                nativeButton={false}
                render={
                  <Link href="/checkout" onNavigate={() => setSheetOpen(false)}>
                    Proceed to checkout
                  </Link>
                }
              />

              <p className="text-center text-[11px] text-muted-foreground">
                Shipping and taxes calculated at checkout
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
