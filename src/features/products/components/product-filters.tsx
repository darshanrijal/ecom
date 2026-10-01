"use client";

import type { RouterOutputs } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  countActiveFilters,
  formatNpr,
  type CatalogFilters,
} from "@/features/products/lib/catalog-filters";
import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

type Facets = RouterOutputs["products"]["getFilterFacets"];

interface ProductFiltersProps {
  facets: Facets;
  filters: CatalogFilters;
  onChange: (next: CatalogFilters) => void;
  onClear: () => void;
  className?: string;
}

export function ProductFilters({
  facets,
  filters,
  onChange,
  onClear,
  className,
}: ProductFiltersProps) {
  const [draftQuery, setDraftQuery] = useState(filters.q);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice ?? facets.priceMin,
    filters.maxPrice ?? facets.priceMax,
  ]);

  useEffect(() => {
    setDraftQuery(filters.q);
  }, [filters.q]);

  useEffect(() => {
    setPriceRange([
      filters.minPrice ?? facets.priceMin,
      filters.maxPrice ?? facets.priceMax,
    ]);
  }, [filters.minPrice, filters.maxPrice, facets.priceMin, facets.priceMax]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (draftQuery === filters.q) {
        return;
      }
      onChange({ ...filters, q: draftQuery });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draftQuery, filters, onChange]);

  const activeCount = countActiveFilters(filters);
  const isFullPriceRange =
    priceRange[0] <= facets.priceMin && priceRange[1] >= facets.priceMax;

  function toggleCategory(slug: string) {
    const exists = filters.categories.includes(slug);
    onChange({
      ...filters,
      categories: exists
        ? filters.categories.filter((item) => item !== slug)
        : [...filters.categories, slug],
    });
  }

  function commitPriceRange(values: number[]) {
    const min = values[0] ?? facets.priceMin;
    const max = values[1] ?? facets.priceMax;
    const nextMin = min <= facets.priceMin ? null : min;
    const nextMax = max >= facets.priceMax ? null : max;
    onChange({
      ...filters,
      minPrice: nextMin,
      maxPrice: nextMax,
    });
  }

  return (
    <aside className={className}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base tracking-tight">Filters</h2>
          {activeCount > 0 ? (
            <p className="text-muted-foreground text-xs">
              {activeCount} active
            </p>
          ) : null}
        </div>
        {activeCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground"
            onClick={onClear}
          >
            Clear all
          </Button>
        ) : null}
      </div>

      <Separator className="my-4" />

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="catalog-search">Search</Label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="catalog-search"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Search products..."
              className="h-10 pr-9 pl-9"
              autoComplete="off"
            />
            {draftQuery ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => {
                  setDraftQuery("");
                  onChange({ ...filters, q: "" });
                }}
              >
                <XIcon className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-medium text-sm">Category</p>
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {facets.categories.map((category) => {
              const checked = filters.categories.includes(category.slug);
              const inputId = `filter-category-${category.slug}`;
              return (
                <li key={category.id}>
                  <div className="flex items-start gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-muted/50">
                    <Checkbox
                      id={inputId}
                      checked={checked}
                      onCheckedChange={() => toggleCategory(category.slug)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={inputId}
                      className="min-w-0 flex-1 cursor-pointer font-normal"
                    >
                      <span className="block text-sm leading-5">
                        {category.name}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {category.productCount}
                      </span>
                    </Label>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm">Price</p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {formatNpr(priceRange[0])} - {formatNpr(priceRange[1])}
            </p>
          </div>

          <Slider
            min={facets.priceMin}
            max={facets.priceMax}
            step={100}
            value={priceRange}
            onValueChange={(values) => {
              const next = values as number[];
              setPriceRange([
                next[0] ?? facets.priceMin,
                next[1] ?? facets.priceMax,
              ]);
            }}
            onValueCommitted={(values) => {
              commitPriceRange(values as number[]);
            }}
            aria-label="Price range"
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="price-min"
                className="text-muted-foreground text-xs"
              >
                Min
              </Label>
              <Input
                id="price-min"
                type="number"
                inputMode="numeric"
                min={facets.priceMin}
                max={priceRange[1]}
                value={priceRange[0]}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isNaN(value)) {
                    return;
                  }
                  setPriceRange([value, priceRange[1]]);
                }}
                onBlur={() => commitPriceRange(priceRange)}
                className="h-9 tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="price-max"
                className="text-muted-foreground text-xs"
              >
                Max
              </Label>
              <Input
                id="price-max"
                type="number"
                inputMode="numeric"
                min={priceRange[0]}
                max={facets.priceMax}
                value={priceRange[1]}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isNaN(value)) {
                    return;
                  }
                  setPriceRange([priceRange[0], value]);
                }}
                onBlur={() => commitPriceRange(priceRange)}
                className="h-9 tabular-nums"
              />
            </div>
          </div>

          {isFullPriceRange ? null : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setPriceRange([facets.priceMin, facets.priceMax]);
                onChange({
                  ...filters,
                  minPrice: null,
                  maxPrice: null,
                });
              }}
            >
              Reset price
            </Button>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="font-medium text-sm">Availability</p>
          <div className="flex items-center gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-muted/50">
            <Checkbox
              id="filter-in-stock"
              checked={filters.inStock}
              onCheckedChange={(checked) =>
                onChange({ ...filters, inStock: checked === true })
              }
            />
            <Label
              htmlFor="filter-in-stock"
              className="cursor-pointer font-normal text-sm"
            >
              In stock only
            </Label>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-muted/50">
            <Checkbox
              id="filter-on-sale"
              checked={filters.onSale}
              onCheckedChange={(checked) =>
                onChange({ ...filters, onSale: checked === true })
              }
            />
            <Label
              htmlFor="filter-on-sale"
              className="cursor-pointer font-normal text-sm"
            >
              On sale
            </Label>
          </div>
        </div>
      </div>
    </aside>
  );
}
