"use client";

import { trpc } from "@/__rpc/client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/features/products/components/add-to-cart-btn";
import { ProductImage } from "@/features/products/components/product-image";
import type { Category } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { PackageXIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

interface ProductClientPageProps {
  slug: string;
}

function useSuspenseProduct(slug: string) {
  const [product] = trpc.products.getProductBySlug.useSuspenseQuery({
    slug,
  });

  return product;
}

function ProductBreadcrumb({
  productName,
  className,
  category,
}: {
  productName: string;
  className?: string;
  category: Category;
}) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator>/</BreadcrumbSeparator>

        <BreadcrumbItem className="shrink-0">
          {/* TODO: Make a category pagero */}
          <BreadcrumbLink render={<Link href={`/category/${category.slug}`} />}>
            {category.name}
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator>/</BreadcrumbSeparator>

        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate">{productName}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export const ProductClientPage = ({ slug }: ProductClientPageProps) => {
  const product = useSuspenseProduct(slug);

  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(
    {}
  );

  const { data: productVariants } = trpc.products.getProductVariants.useQuery(
    {
      productId: product?.id ?? "",
    },
    {
      enabled: !!product?.id,
    }
  );

  const options = productVariants?.options ?? [];
  const skus = productVariants?.skus ?? [];

  const selectedSku = useMemo(() => {
    if (!options.length) {
      return;
    }

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

  if (!product) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-muted">
            <PackageXIcon className="size-7 text-muted-foreground" />
          </div>

          <h1 className="font-semibold text-2xl">Product not found</h1>

          <p className="mt-2 text-muted-foreground text-sm leading-6">
            We couldn&apos;t find the product you&apos;re looking for. It may
            have been removed or the link may be incorrect.
          </p>

          <Button
            nativeButton={false}
            render={<Link href="/" />}
            className="mt-6"
          >
            Continue shopping
          </Button>
        </div>
      </main>
    );
  }

  const [minPriceSKU] = product.productSKUs;

  const defaultSku = options.length === 0 ? minPriceSKU : undefined;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-10 sm:gap-8 sm:px-6 lg:px-8">
      <ProductBreadcrumb
        productName={product.name}
        category={product.category}
        className="mt-4 sm:mt-6"
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
        {/* Product image */}
        <section className="w-full">
          <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-xl sm:max-w-lg md:sticky md:top-24">
            <ProductImage
              alt={`Image of ${product.name}`}
              src={selectedSku?.imageUrl ?? product.baseImage}
            />
          </div>
        </section>

        {/* Product information */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="space-y-2">
            <h1 className="font-semibold text-2xl leading-tight sm:text-3xl">
              {product.name}
            </h1>

            {!!selectedSku && (
              <p className="text-lg sm:text-xl">
                NPR.{" "}
                <span className="font-semibold text-2xl">
                  {Number(selectedSku.price).toLocaleString()}
                </span>
              </p>
            )}
          </div>

          <p className="max-w-xl text-muted-foreground text-sm leading-6 sm:text-base">
            {product.description}
          </p>

          {/* Product variants */}
          {options.length > 0 && (
            <div className="mt-2 space-y-6 sm:mt-4">
              {options.map((option) => {
                const selectedValue = selectedValues[option.id];

                return (
                  <div key={option.id} className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium text-sm">{option.name}</p>

                      {!!selectedValue && (
                        <span className="truncate text-muted-foreground text-sm">
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

                          const containsValue = sku.optionValues.some(
                            (optionValue) =>
                              optionValue.optionId === option.id &&
                              optionValue.id === value.id
                          );

                          if (!containsValue) {
                            return false;
                          }

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
                            onClick={() =>
                              handleValueSelect(option.id, value.id)
                            }
                            className={cn(
                              "min-h-10 rounded-lg border px-4 py-2 text-sm transition-colors",
                              "hover:bg-accent",
                              "disabled:pointer-events-none disabled:opacity-40",
                              isSelected &&
                                "border-primary bg-primary text-primary-foreground hover:bg-primary"
                            )}
                          >
                            {value.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected variant */}
          {selectedSku && (
            <div className="rounded-xl border bg-muted/40 p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-sm">
                    Selected variant
                  </p>

                  <p className="font-semibold">
                    NPR. {Number(selectedSku.price).toLocaleString()}
                  </p>
                </div>

                {selectedSku.stock < 15 && (
                  <p className="shrink-0 text-muted-foreground text-sm">
                    {selectedSku.stock} available
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Add to cart */}
          <div className="pt-1 sm:pt-2">
            <AddToCartButton
              productId={product.id}
              productName={product.name}
              skuId={selectedSku?.id ?? defaultSku?.id}
              disabled={
                options.length > 0 && (!selectedSku || selectedSku.stock <= 0)
              }
              className="w-full p-6"
            />
          </div>
        </section>
      </div>
    </div>
  );
};
