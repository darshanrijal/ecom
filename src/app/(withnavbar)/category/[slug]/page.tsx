import { api, HydrateClient } from "@/__rpc/server";
import { ErrorBoundary } from "@/components/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { CategoryClientPage } from "./page.client";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: categorySlug } = await params;
  api.products.getProductsByCategorySlug.prefetchInfinite({ categorySlug });
  return (
    <HydrateClient>
      <Suspense
        fallback={
          <main aria-busy="true" className="mx-auto w-full max-w-7xl p-6">
            <span className="sr-only">Loading product...</span>

            <Skeleton className="h-8 w-2/3" />

            <div className="mt-6 grid gap-8 md:grid-cols-2">
              <Skeleton className="aspect-square w-full rounded-lg" />

              <div className="space-y-4">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-1/3" />
              </div>
            </div>
          </main>
        }
      >
        <ErrorBoundary
          fallback={
            <main role="alert" className="mx-auto max-w-2xl p-10 text-center">
              <h1 className="font-semibold text-2xl">
                Unable to load the product in this category
              </h1>
              <p className="mt-2 text-muted-foreground">
                Something went wrong while loading the product. Please try again
                later.
              </p>
            </main>
          }
        >
          <CategoryClientPage categorySlug={categorySlug} />
        </ErrorBoundary>
      </Suspense>
    </HydrateClient>
  );
}
