"use client";
import { trpc } from "@/__rpc/client";
import { Spinner } from "@/components/ui/spinner";
import { useEffect, useRef } from "react";

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
    return <div>Loading products...</div>;
  }
  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  // Flatten array across pages
  const products = data?.pages.flatMap((page) => page.products) ?? [];

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {products.map((product) => (
          <div key={product.id} className="rounded border p-4">
            <h3>{product.name}</h3>
          </div>
        ))}
      </div>
      <div ref={loadMoreRef} />
      <div className="my-10 flex items-center justify-center">
        {!!isFetchingNextPage && <Spinner />}
      </div>
    </div>
  );
}
