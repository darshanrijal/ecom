import { api, HydrateClient } from "@/__rpc/server";
import { notFound } from "next/navigation";
import { SearchClientPage } from "./page.client";
import { Suspense } from "react";
import { ProductCardSkeleton } from "@/features/products/components/product-card-skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import { AlertTriangle } from "lucide-react";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ input?: string }>;
}) {
  const { input } = await searchParams;

  if (!input) {
    notFound();
  }

  api.products.searchProduct.prefetchInfinite({ search: input });

  return (
    <HydrateClient>
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Empty array
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        }
      >
        <ErrorBoundary
          fallback={
            <main
              role="alert"
              className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-20 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h1 className="mt-4 font-bold text-xl tracking-tight">
                Unable to load products
              </h1>
              <p className="mt-2 text-muted-foreground text-sm">
                Something went wrong while fetching the search results. Please
                check your internet connection or try refreshing the page.
              </p>
            </main>
          }
        >
          <SearchClientPage search={input} />
        </ErrorBoundary>
      </Suspense>
    </HydrateClient>
  );
}
