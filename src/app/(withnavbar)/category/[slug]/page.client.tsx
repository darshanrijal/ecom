"use client";

import { trpc } from "@/__rpc/client";
import { Spinner } from "@/components/ui/spinner";
import { ProductCard } from "@/features/products/components/product-card";
import { PackageSearch, SearchX } from "lucide-react";
import { useEffect, useRef } from "react";

export const CategoryClientPage = ({
  categorySlug,
}: {
  categorySlug: string;
}) => {
  const [data, { fetchNextPage, hasNextPage, isFetchingNextPage }] =
    trpc.products.getProductsByCategorySlug.useSuspenseInfiniteQuery(
      { categorySlug },
      {
        getNextPageParam: (lp) => lp.nextCursor,
      }
    );

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      {
        rootMargin: "200px",
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage]);

  const products = data?.pages.flatMap((page) => page.products) ?? [];

  if (products.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 p-4">
          <SearchX className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="mt-6 font-semibold text-2xl tracking-tight">
          No products found
        </h2>
        <p className="mt-2 max-w-md text-muted-foreground text-sm">
          We couldn't find any products matching{" "}
          <span className="font-medium text-foreground">"{categorySlug}"</span>.
          Try checking for typos or searching for another category.
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Search Result Count Banner */}
      <div className="mb-6 flex items-center gap-2 text-muted-foreground text-sm">
        <PackageSearch className="h-4 w-4" />
        <span>
          Showing category results for{" "}
          <span className="font-semibold text-foreground">
            "{categorySlug}"
          </span>
        </span>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            contentClassName="w-full transition-transform hover:-translate-y-1 hover:shadow-md"
            key={product.id}
            product={product}
          />
        ))}
      </div>

      {/* Infinite Scroll Trigger & Loader */}
      <div ref={loadMoreRef} className="h-10" />

      {!!isFetchingNextPage && (
        <div className="my-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Spinner className="h-6 w-6" />
          <span className="text-xs">Loading more products...</span>
        </div>
      )}
    </div>
  );
};
