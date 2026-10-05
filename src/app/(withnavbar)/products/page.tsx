import { api, HydrateClient } from "@/__rpc/server";
import { ProductCardSkeleton } from "@/features/products/components/product-card-skeleton";
import { ProductCatalog } from "@/features/products/components/product-catalog";
import { preventUnauthorized } from "@/lib/auth";
import { Suspense } from "react";

function parseCategorySlugs(
  categoryParam: string | string[] | undefined
): string[] | undefined {
  if (Array.isArray(categoryParam)) {
    const slugs = categoryParam.filter(Boolean);
    return slugs.length > 0 ? slugs : undefined;
  }
  if (typeof categoryParam === "string" && categoryParam.length > 0) {
    return [categoryParam];
  }
}

function parseOptionalNumber(value: string | string[] | undefined) {
  if (typeof value !== "string" || value === "") {
    return;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const SORTS = ["newest", "price-asc", "price-desc", "name"] as const;
type Sort = (typeof SORTS)[number];

function parseSort(value: string | string[] | undefined): Sort {
  if (typeof value === "string" && SORTS.includes(value as Sort)) {
    return value as Sort;
  }
  return "newest";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await preventUnauthorized();
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : undefined;
  const categorySlugs = parseCategorySlugs(params.category);
  const minPrice = parseOptionalNumber(params.min);
  const maxPrice = parseOptionalNumber(params.max);
  const sort = parseSort(params.sort);

  await Promise.all([
    api.products.getFilterFacets.prefetch(),
    api.products.browseProducts.prefetchInfinite({
      limit: 20,
      search: search || undefined,
      categorySlugs,
      minPrice,
      maxPrice,
      inStock: params.stock === "1" || undefined,
      onSale: params.sale === "1" || undefined,
      sort,
    }),
  ]);

  return (
    <HydrateClient>
      <main>
        <Suspense
          fallback={
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <div className="mb-8 h-16 w-64 animate-pulse rounded-lg bg-muted" />
              <div className="grid gap-8 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
                <div className="hidden h-96 animate-pulse rounded-2xl bg-muted lg:block" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {["s1", "s2", "s3", "s4", "s5", "s6"].map((id) => (
                    <ProductCardSkeleton key={id} />
                  ))}
                </div>
              </div>
            </div>
          }
        >
          <ProductCatalog />
        </Suspense>
      </main>
    </HydrateClient>
  );
}
