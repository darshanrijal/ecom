"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "./add-to-cart-btn";
import { ProductImage } from "./product-image";

interface SkuOptionValue {
  id: string;
  value: string;
  option: { id: string; name: string };
}

interface Sku {
  id: string;
  sku: string;
  price: unknown;
  stock: number;
  imageUrl: string | null;
  optionValues: SkuOptionValue[];
}

export interface ProductCardProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  baseImage: string | null;
  productSKUs: Sku[];
}

interface ProductCardProps {
  product: ProductCardProduct;
}

function formatPrice(price: unknown): string {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

export function ProductCard({ product }: ProductCardProps) {
  const { productSKUs, name, slug, baseImage } = product;

  const optionGroups = useMemo(() => {
    const groups = new Map<string, Map<string, string>>();

    for (const sku of productSKUs) {
      for (const ov of sku.optionValues) {
        if (!groups.has(ov.option.name)) {
          groups.set(ov.option.name, new Map());
        }
        groups.get(ov.option.name)?.set(ov.id, ov.value);
      }
    }

    return groups;
  }, [productSKUs]);

  const [selectedOptionValueIds, setSelectedOptionValueIds] = useState<
    Map<string, string>
  >(() => new Map());

  const selectedSku = useMemo(() => {
    if (selectedOptionValueIds.size === 0) {
      return null;
    }

    return (
      productSKUs.find((sku) => {
        const skuOptionIds = sku.optionValues.map((ov) => ov.id);
        return (
          skuOptionIds.length === selectedOptionValueIds.size &&
          skuOptionIds.every((id) =>
            selectedOptionValueIds.values().toArray().includes(id)
          )
        );
      }) ?? null
    );
  }, [productSKUs, selectedOptionValueIds]);

  const autoSelectFirstVariant = useCallback(() => {
    if (productSKUs.length === 0) {
      return;
    }

    const [firstSku] = productSKUs;
    const initial = new Map<string, string>();
    for (const ov of firstSku.optionValues) {
      initial.set(ov.option.name, ov.id);
    }
    setSelectedOptionValueIds(initial);
  }, [productSKUs]);

  useEffect(() => {
    autoSelectFirstVariant();
  }, [autoSelectFirstVariant]);

  function handleOptionSelect(optionName: string, optionValueId: string) {
    setSelectedOptionValueIds((prev) => {
      const next = new Map(prev);
      next.set(optionName, optionValueId);
      return next;
    });
  }

  let displayPrice: string | null = null;
  if (selectedSku) {
    displayPrice = formatPrice(selectedSku.price);
  } else if (productSKUs[0]) {
    displayPrice = formatPrice(productSKUs[0].price);
  }

  const displayImage = selectedSku?.imageUrl ?? baseImage;
  const isOutOfStock = selectedSku !== null && selectedSku.stock <= 0;

  return (
    <Card className="gap-0 overflow-hidden p-0 ring-0">
      <Link href={`/products/${slug}`} className="block">
        <CardContent className="p-0">
          <ProductImage src={displayImage} alt={name} />
        </CardContent>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link
          href={`/products/${slug}`}
          className="line-clamp-2 font-medium text-foreground text-sm leading-snug hover:underline"
        >
          {name}
        </Link>

        {displayPrice !== null && (
          <p className="font-semibold text-base text-foreground">
            {displayPrice}
          </p>
        )}

        {Array.from(optionGroups.entries()).map(([optionName, values]) => (
          <div key={optionName} className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs">{optionName}</span>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(values.entries()).map(([valueId, value]) => (
                <button
                  key={valueId}
                  type="button"
                  onClick={() => handleOptionSelect(optionName, valueId)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs transition-colors",
                    selectedOptionValueIds.get(optionName) === valueId
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:border-foreground/40"
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <CardFooter className="px-4 pt-0 pb-4">
        <AddToCartButton
          skuId={selectedSku?.id ?? productSKUs[0]?.id ?? ""}
          disabled={(!selectedSku && productSKUs.length > 0) || isOutOfStock}
        />
      </CardFooter>
    </Card>
  );
}
