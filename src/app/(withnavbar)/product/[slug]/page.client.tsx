"use client";

import { type RouterOutputs, trpc } from "@/__rpc/client";
import { Badge } from "@/components/ui/badge";
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
import { ProductCard } from "@/features/products/components/product-card";
import { ProductImage } from "@/features/products/components/product-image";
import {
  ProductRatingSummary,
  ReviewsSection,
} from "@/features/products/components/reviews-section";
import { StockBadge } from "@/features/products/components/stock-badge";
import { VariantChips } from "@/features/products/components/variant-chips";
import { cn } from "@/lib/utils";
import {
  BanknoteIcon,
  MinusIcon,
  PackageXIcon,
  PlusIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  TruckIcon,
} from "lucide-react";
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
  category: { name: string; slug: string };
}) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator>/</BreadcrumbSeparator>

        <BreadcrumbItem className="shrink-0">
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

const TRUST_ITEMS = [
  { icon: TruckIcon, label: "Free delivery" },
  { icon: ShieldCheckIcon, label: "1-year warranty" },
  { icon: RotateCcwIcon, label: "7-day returns" },
  { icon: BanknoteIcon, label: "Cash on delivery" },
] as const;

type PDPProduct = NonNullable<RouterOutputs["products"]["getProductBySlug"]>;
type PDPSku = PDPProduct["productSKUs"][number];

function ProductGallery({
  product,
  selectedSku,
  discountPercentage,
  showDiscount,
  onSelectValues,
}: {
  product: PDPProduct;
  selectedSku?: PDPSku;
  discountPercentage: number;
  showDiscount: boolean;
  onSelectValues: (values: Record<string, string>) => void;
}) {
  const activeImageUrl = selectedSku?.imageUrl ?? product.baseImage;

  const gallerySkus = [
    ...new Map(
      product.productSKUs
        .filter((sku) => !!sku.imageUrl)
        .map((sku) => [sku.imageUrl, sku] as const)
    ).values(),
  ];

  return (
    <section className="w-full">
      <div className="relative overflow-hidden rounded-2xl border bg-linear-to-b from-muted/60 to-muted/20 lg:sticky lg:top-24">
        {!!showDiscount && (
          <span className="absolute top-4 left-4 z-10 rounded-md bg-destructive px-2.5 py-1 font-semibold text-white text-xs">
            {discountPercentage}% OFF
          </span>
        )}

        <div className="aspect-square p-6 sm:p-10">
          <ProductImage
            alt={`Image of ${product.name}`}
            src={activeImageUrl}
            className="h-full w-full"
            imageClassName="rounded-none object-contain"
          />
        </div>

        {gallerySkus.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-t bg-background/60 p-3">
            {gallerySkus.map((sku) => {
              const isActive = sku.imageUrl === activeImageUrl;

              return (
                <button
                  key={sku.id}
                  type="button"
                  aria-label={`View ${product.name} variant`}
                  aria-pressed={isActive}
                  onClick={() =>
                    onSelectValues(
                      Object.fromEntries(
                        sku.optionValues.map((ov) => [ov.optionId, ov.id])
                      )
                    )
                  }
                  className={cn(
                    "size-16 shrink-0 overflow-hidden rounded-lg border bg-muted/40 p-1 transition-all",
                    isActive
                      ? "border-primary ring-1 ring-primary"
                      : "hover:border-foreground/40"
                  )}
                >
                  <ProductImage
                    alt={product.name}
                    src={sku.imageUrl}
                    className="h-full w-full"
                    imageClassName="rounded-none object-contain"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export const ProductClientPage = ({ slug }: ProductClientPageProps) => {
  const product = useSuspenseProduct(slug);

  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(
    {}
  );
  const [quantity, setQuantity] = useState(1);

  const { data: relatedData } = trpc.products.getRelatedProducts.useQuery({
    slug,
    limit: 4,
  });

  const selectedSku = useMemo(() => {
    const options = product?.options ?? [];
    const skus = product?.productSKUs ?? [];

    if (
      !options.length ||
      Object.keys(selectedValues).length !== options.length
    ) {
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
  }, [product, selectedValues]);

  function handleValueSelect(optionId: string, valueId: string) {
    setSelectedValues((current) => ({
      ...current,
      [optionId]: valueId,
    }));
    setQuantity(1);
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

  const { options, productSKUs: skus } = product;
  const [minPriceSKU] = skus;

  const defaultSku = options.length === 0 ? minPriceSKU : undefined;
  const displaySku = selectedSku ?? minPriceSKU;

  const price = Number(displaySku?.price ?? 0);
  const originalPrice = Number(displaySku?.originalPrice ?? 0);
  const hasDiscount = originalPrice > price;

  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const activeStock = (selectedSku ?? defaultSku)?.stock;
  const stepperMax = Math.max(1, activeStock ?? 99);
  const qty = Math.min(quantity, stepperMax);

  const related = relatedData?.products ?? [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-16 sm:px-6 lg:px-8">
      <ProductBreadcrumb
        productName={product.name}
        category={product.category}
        className="mt-4 sm:mt-6"
      />

      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
        {/* Gallery */}
        <ProductGallery
          product={product}
          selectedSku={selectedSku}
          discountPercentage={discountPercentage}
          showDiscount={hasDiscount}
          onSelectValues={setSelectedValues}
        />

        {/* Product information */}
        <section className="flex min-w-0 flex-col gap-6">
          <div>
            <Link
              href={`/category/${product.category.slug}`}
              className="inline-flex w-fit items-center rounded-full border px-3 py-1 font-medium text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-foreground"
            >
              {product.category.name}
            </Link>

            <h1 className="mt-3 font-semibold text-2xl leading-tight tracking-tight sm:text-3xl">
              {product.name}
            </h1>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <ProductRatingSummary productId={product.id} />
              <StockBadge stock={displaySku?.stock ?? 0} />
            </div>
          </div>

          {/* Buy box */}
          <div className="space-y-5 rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
            {/* Price */}
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-bold text-3xl tracking-tight">
                  NPR {price.toLocaleString()}
                </span>

                {hasDiscount && (
                  <span className="text-base text-muted-foreground line-through">
                    NPR {originalPrice.toLocaleString()}
                  </span>
                )}

                {hasDiscount && (
                  <Badge variant="destructive" className="font-semibold">
                    {discountPercentage}% OFF
                  </Badge>
                )}
              </div>

              {hasDiscount && (
                <p className="mt-1 font-medium text-emerald-600 text-sm">
                  You save NPR {(originalPrice - price).toLocaleString()}
                </p>
              )}
            </div>

            {/* Variants */}
            {options.length > 0 && (
              <div className="border-t pt-4">
                <VariantChips
                  options={options}
                  skus={skus}
                  selectedValues={selectedValues}
                  onSelect={handleValueSelect}
                />
              </div>
            )}

            {/* Quantity + CTA */}
            <div className="flex items-center gap-3 border-t pt-4">
              <div className="flex h-11 shrink-0 items-center overflow-hidden rounded-lg border">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="flex h-full items-center justify-center px-3 text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <MinusIcon className="size-3.5" />
                </button>

                <span className="w-9 text-center font-medium text-sm tabular-nums">
                  {qty}
                </span>

                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() =>
                    setQuantity((q) => Math.min(stepperMax, q + 1))
                  }
                  disabled={qty >= stepperMax}
                  className="flex h-full items-center justify-center px-3 text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <PlusIcon className="size-3.5" />
                </button>
              </div>

              <AddToCartButton
                className="h-11 flex-1"
                productId={product.id}
                productName={product.name}
                skuId={selectedSku?.id ?? defaultSku?.id}
                disabled={
                  options.length > 0 && (!selectedSku || selectedSku.stock <= 0)
                }
                quantity={qty}
                size="lg"
              />
            </div>

            {/* Trust row */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 sm:grid-cols-4">
              {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
            <h2 className="font-semibold text-lg">Description</h2>

            <p className="mt-3 max-w-2xl text-muted-foreground text-sm leading-7 sm:text-base">
              {product.description}
            </p>
          </div>
        </section>
      </div>

      {/* Ratings & reviews */}
      <ReviewsSection productId={product.id} />

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-12 sm:mt-16">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-semibold text-xl tracking-tight sm:text-2xl">
              You may also like
            </h2>

            <Link
              href={`/category/${product.category.slug}`}
              className="shrink-0 text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              View all →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
