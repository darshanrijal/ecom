"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useCart } from "@/hooks/use-cart";
import { trpc } from "@/__rpc/client";
import { ShoppingCartIcon, CheckIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  skuId?: string;
  disabled?: boolean;
  productName: string;
  productId: string;
}

export function AddToCartButton({
  skuId,
  disabled,
  productName,
  productId,
}: AddToCartButtonProps) {
  const { addToCart } = useCart();

  const [open, setOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(
    {}
  );

  const { data, isLoading } = trpc.products.getProductVariants.useQuery(
    { productId },
    {
      enabled: !skuId,
    }
  );

  const options = data?.options ?? [];
  const skus = data?.skus ?? [];

  /**
   * Find the SKU matching the currently selected options.
   */
  const selectedSku = useMemo(() => {
    if (!options.length) {
      return;
    }

    // Don't try to find a SKU until every option has been selected.
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

  function handleValueSelect(optionId: string, valueId: string) {
    setSelectedValues((current) => ({
      ...current,
      [optionId]: valueId,
    }));
  }

  function handleAddToCart() {
    // No variant selection needed.
    if (skuId) {
      addToCart({
        skuId,
        quantity: 1,
      });

      toast.add({
        title: "Added to cart",
        type: "success",
      });

      return;
    }

    // Product has variants, so open selector.
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
      quantity: 1,
    });

    toast.add({
      title: "Added to cart",
      type: "success",
    });

    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
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
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose your options</DialogTitle>

          <DialogDescription>
            Choose a variant of {productName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Loading options...
            </div>
          ) : (
            options.map((option) => {
              const selectedValue = selectedValues[option.id];

              return (
                <div key={option.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{option.name}</h3>

                    {!!selectedValue && (
                      <span className="text-muted-foreground text-sm">
                        {
                          option.values.find(
                            (value) => value.id === selectedValue
                          )?.value
                        }
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {option.values.map((value) => {
                      const isSelected = selectedValue === value.id;

                      const isAvailable = skus.some((sku) => {
                        if (sku.stock <= 0) {
                          return false;
                        }

                        // This value must belong to the SKU.
                        const containsValue = sku.optionValues.some(
                          (optionValue) =>
                            optionValue.optionId === option.id &&
                            optionValue.id === value.id
                        );

                        if (!containsValue) {
                          return false;
                        }

                        // Check all already-selected options.
                        return Object.entries(selectedValues).every(
                          ([selectedOptionId, selectedValueId]) =>
                            selectedOptionId === option.id ||
                            sku.optionValues.some(
                              (optionValue) =>
                                optionValue.optionId === selectedOptionId &&
                                optionValue.id === selectedValueId
                            )
                        );
                      });

                      return (
                        <button
                          key={value.id}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => handleValueSelect(option.id, value.id)}
                          className={cn(
                            "relative rounded-lg border px-4 py-2 text-sm transition-colors",
                            "hover:bg-accent",
                            "disabled:pointer-events-none disabled:opacity-40",
                            isSelected &&
                              "border-primary bg-primary text-primary-foreground hover:bg-primary"
                          )}
                        >
                          {value.value}

                          {isSelected && (
                            <CheckIcon className="ml-2 inline-block size-3.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {/* Selected SKU information */}
          {selectedSku && (
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Price</p>

                  <p className="font-semibold text-lg">
                    Rs. {Number(selectedSku.price).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            className="w-full bg-orange-500 hover:bg-orange-400"
            disabled={!selectedSku || selectedSku.stock <= 0}
            onClick={handleVariantAddToCart}
          >
            <ShoppingCartIcon />
            {selectedSku?.stock === 0 ? "Out of stock" : "Add selected variant"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
