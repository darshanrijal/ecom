export type CatalogSort = "newest" | "price-asc" | "price-desc" | "name";

export interface CatalogFilters {
  q: string;
  categories: string[];
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  onSale: boolean;
  sort: CatalogSort;
}

export const DEFAULT_SORT: CatalogSort = "newest";

export const SORT_OPTIONS: Array<{ value: CatalogSort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name A-Z" },
];

export function emptyFilters(): CatalogFilters {
  return {
    q: "",
    categories: [],
    minPrice: null,
    maxPrice: null,
    inStock: false,
    onSale: false,
    sort: DEFAULT_SORT,
  };
}

export function parseCatalogFilters(
  params: URLSearchParams,
  bounds?: { priceMin: number; priceMax: number }
): CatalogFilters {
  const q = params.get("q")?.trim() ?? "";
  const categories = params.getAll("category").filter(Boolean);
  const sortParam = params.get("sort");
  const sort = SORT_OPTIONS.some((option) => option.value === sortParam)
    ? (sortParam as CatalogSort)
    : DEFAULT_SORT;

  const minRaw = params.get("min");
  const maxRaw = params.get("max");
  let minPrice = minRaw !== null && minRaw !== "" ? Number(minRaw) : null;
  let maxPrice = maxRaw !== null && maxRaw !== "" ? Number(maxRaw) : null;

  if (minPrice !== null && Number.isNaN(minPrice)) {
    minPrice = null;
  }
  if (maxPrice !== null && Number.isNaN(maxPrice)) {
    maxPrice = null;
  }

  if (bounds) {
    if (minPrice !== null) {
      minPrice = Math.max(bounds.priceMin, Math.min(bounds.priceMax, minPrice));
    }
    if (maxPrice !== null) {
      maxPrice = Math.max(bounds.priceMin, Math.min(bounds.priceMax, maxPrice));
    }
  }

  return {
    q,
    categories,
    minPrice,
    maxPrice,
    inStock: params.get("stock") === "1",
    onSale: params.get("sale") === "1",
    sort,
  };
}

export function catalogFiltersToParams(
  filters: CatalogFilters
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.q.trim()) {
    params.set("q", filters.q.trim());
  }
  for (const slug of filters.categories) {
    params.append("category", slug);
  }
  if (filters.minPrice !== null) {
    params.set("min", String(Math.round(filters.minPrice)));
  }
  if (filters.maxPrice !== null) {
    params.set("max", String(Math.round(filters.maxPrice)));
  }
  if (filters.inStock) {
    params.set("stock", "1");
  }
  if (filters.onSale) {
    params.set("sale", "1");
  }
  if (filters.sort !== DEFAULT_SORT) {
    params.set("sort", filters.sort);
  }

  return params;
}

export function countActiveFilters(filters: CatalogFilters): number {
  let count = 0;
  if (filters.q.trim()) {
    count += 1;
  }
  count += filters.categories.length;
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    count += 1;
  }
  if (filters.inStock) {
    count += 1;
  }
  if (filters.onSale) {
    count += 1;
  }
  return count;
}

export function formatNpr(value: number) {
  return `NPR ${Math.round(value).toLocaleString("en-NP")}`;
}
