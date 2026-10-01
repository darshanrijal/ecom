"use client";

import type { RouterOutputs } from "@/__rpc/client";
import { trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { ProductCard } from "@/features/products/components/product-card";
import { ProductCardSkeleton } from "@/features/products/components/product-card-skeleton";
import { ProductFilters } from "@/features/products/components/product-filters";
import {
  catalogFiltersToParams,
  countActiveFilters,
  emptyFilters,
  parseCatalogFilters,
  SORT_OPTIONS,
  type CatalogFilters,
  type CatalogSort,
} from "@/features/products/lib/catalog-filters";
import { FilterIcon, PackageSearchIcon, SearchXIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

type BrowseProduct =
  RouterOutputs["products"]["browseProducts"]["products"][number];

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-3">
      {["a", "b", "c", "d", "e", "f"].map((id) => (
        <ProductCardSkeleton key={id} />
      ))}
    </div>
  );
}

function CatalogEmpty({
  canClear,
  onClear,
}: {
  canClear: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <SearchXIcon className="size-7 text-muted-foreground" />
      </div>
      <h2 className="mt-5 font-semibold text-xl tracking-tight">
        No products match
      </h2>
      <p className="mt-2 max-w-md text-muted-foreground text-sm leading-relaxed">
        Try clearing filters or searching with a different term.
      </p>
      {canClear ? (
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={onClear}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

function CatalogResults({
  products,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  loadMoreRef,
}: {
  products: BrowseProduct[];
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div
        className={`grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-3 ${
          isFetching && !isFetchingNextPage ? "opacity-70" : ""
        }`}
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div ref={loadMoreRef} className="h-8" />

      <div className="mt-4 flex min-h-10 items-center justify-center">
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Spinner className="size-4" />
            Loading more
          </div>
        ) : null}
        {!hasNextPage && products.length > 0 ? (
          <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <PackageSearchIcon className="size-3.5" />
            End of results
          </p>
        ) : null}
      </div>
    </>
  );
}

function useCatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: facets, isLoading: facetsLoading } =
    trpc.products.getFilterFacets.useQuery();

  const filters = parseCatalogFilters(
    new URLSearchParams(searchParams.toString()),
    facets
      ? { priceMin: facets.priceMin, priceMax: facets.priceMax }
      : undefined,
  );

  const writeFilters = useEffectEvent((next: CatalogFilters) => {
    const params = catalogFiltersToParams(next);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  });

  return { facets, facetsLoading, filters, writeFilters };
}

function CatalogToolbar({
  resultCountLabel,
  query,
  activeFilterCount,
  mobileFiltersOpen,
  onMobileFiltersOpenChange,
  facets,
  filters,
  onFiltersChange,
  onClearFilters,
}: {
  resultCountLabel: string;
  query: string;
  activeFilterCount: number;
  mobileFiltersOpen: boolean;
  onMobileFiltersOpenChange: (open: boolean) => void;
  facets: RouterOutputs["products"]["getFilterFacets"] | undefined;
  filters: CatalogFilters;
  onFiltersChange: (next: CatalogFilters) => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">All products</h1>
        <p className="text-muted-foreground text-sm">
          {resultCountLabel}
          {query ? (
            <>
              {" "}
              for{" "}
              <span className="font-medium text-foreground">
                &ldquo;{query}&rdquo;
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Sheet
          open={mobileFiltersOpen}
          onOpenChange={onMobileFiltersOpenChange}
        >
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="lg:hidden"
                aria-label="Open filters"
              >
                <FilterIcon className="size-4" />
                Filters
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 font-medium text-[10px] text-primary-foreground tabular-nums">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            }
          />
          <SheetContent side="left" className="w-[min(100%,22rem)] p-0">
            <SheetHeader className="border-b px-4 py-4 text-left">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto p-4">
              {facets ? (
                <ProductFilters
                  facets={facets}
                  filters={filters}
                  onChange={onFiltersChange}
                  onClear={onClearFilters}
                />
              ) : null}
            </div>
          </SheetContent>
        </Sheet>

        <Select
          value={filters.sort}
          onValueChange={(value) => {
            if (!value) {
              return;
            }
            onFiltersChange({ ...filters, sort: value as CatalogSort });
          }}
        >
          <SelectTrigger className="w-[11.5rem]" aria-label="Sort products">
            <SelectValue>
              {
                SORT_OPTIONS.find((option) => option.value === filters.sort)
                  ?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function ProductCatalog() {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { facets, facetsLoading, filters, writeFilters } = useCatalogFilters();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    isFetching,
  } = trpc.products.browseProducts.useInfiniteQuery(
    {
      limit: 20,
      search: filters.q || undefined,
      categorySlugs:
        filters.categories.length > 0 ? filters.categories : undefined,
      minPrice: filters.minPrice ?? undefined,
      maxPrice: filters.maxPrice ?? undefined,
      inStock: filters.inStock || undefined,
      onSale: filters.onSale || undefined,
      sort: filters.sort,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  function clearFilters() {
    writeFilters({ ...emptyFilters(), sort: filters.sort });
    setMobileFiltersOpen(false);
  }

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const products = data?.pages.flatMap((page) => page.products) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const activeFilterCount = countActiveFilters(filters);
  const isInitialLoading = isLoading || facetsLoading;
  const resultCountLabel = isInitialLoading
    ? "Loading catalog..."
    : `${total} ${total === 1 ? "product" : "products"}`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CatalogToolbar
        resultCountLabel={resultCountLabel}
        query={filters.q}
        activeFilterCount={activeFilterCount}
        mobileFiltersOpen={mobileFiltersOpen}
        onMobileFiltersOpenChange={setMobileFiltersOpen}
        facets={facets}
        filters={filters}
        onFiltersChange={writeFilters}
        onClearFilters={clearFilters}
      />

      <div className="grid gap-8 lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:gap-10">
        <div className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border bg-card p-5">
            {facets ? (
              <ProductFilters
                facets={facets}
                filters={filters}
                onChange={writeFilters}
                onClear={clearFilters}
              />
            ) : (
              <div className="space-y-4">
                <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                <div className="h-10 animate-pulse rounded-lg bg-muted" />
                <div className="h-40 animate-pulse rounded-lg bg-muted" />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          {isError ? (
            <div
              role="alert"
              className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center"
            >
              <h2 className="font-semibold text-lg">Unable to load products</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                {error.message}
              </p>
            </div>
          ) : null}

          {isInitialLoading ? <CatalogSkeleton /> : null}

          {!isInitialLoading && !isError && products.length === 0 ? (
            <CatalogEmpty
              canClear={activeFilterCount > 0}
              onClear={clearFilters}
            />
          ) : null}

          {!isInitialLoading && !isError && products.length > 0 ? (
            <CatalogResults
              products={products}
              isFetching={isFetching}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={!!hasNextPage}
              loadMoreRef={loadMoreRef}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
