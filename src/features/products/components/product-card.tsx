"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
