"use client";
import { trpc } from "@/__rpc/client";
import { Spinner } from "@/components/ui/spinner";
import { useEffect, useRef } from "react";
import { ProductCard } from "./product-card";
import { ProductCardSkeleton } from "./product-card-skeleton";

export function ProductList() {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = trpc.products.getAllProducts.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {["sk1", "sk2", "sk3", "sk4", "sk5", "sk6", "sk7", "sk8"].map(
            (id) => (
              <ProductCardSkeleton key={id} />
            )
          )}
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        Error: {error.message}
      </div>
    );
  }

  // Flatten array across pages
  const products = data?.pages.flatMap((page) => page.products) ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <div ref={loadMoreRef} />
      <div className="my-10 flex items-center justify-center">
        {!!isFetchingNextPage && <Spinner />}
      </div>
    </div>
  );
}
