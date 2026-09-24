"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CopyIcon,
  EyeOffIcon,
  MoreHorizontalIcon,
  PencilIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  adminProducts,
  productCategories,
  productStatuses,
  type AdminProduct,
} from "@/features/admin/data";
import { ProductStatusBadge } from "@/features/admin/components/status-badge";

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-medium text-red-700 text-xs dark:text-red-400">
        Out of stock
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-700 text-xs dark:text-amber-400">
        {stock} left
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-700 text-xs dark:text-emerald-400">
      {stock} in stock
    </span>
  );
}

function filterProducts(
  products: AdminProduct[],
  filters: {
    query: string;
    category: string;
    status: string;
  }
) {
  const query = filters.query.trim().toLowerCase();

  return products.filter((product) => {
    if (filters.category !== "all" && product.category !== filters.category) {
      return false;
    }
    if (filters.status !== "all" && product.status !== filters.status) {
      return false;
    }
    if (!query) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query)
    );
  });
}

export function ProductsTable() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = filterProducts(adminProducts, { query, category, status });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products, SKUs…"
          className="w-full sm:max-w-xs"
          aria-label="Search products"
        />
        <div className="flex flex-1 justify-start gap-2 sm:justify-end">
          <Select
            value={category}
            onValueChange={(value) => setCategory(value ?? "all")}
          >
            <SelectTrigger className="w-44" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {productCategories.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value ?? "all")}
          >
            <SelectTrigger className="w-36" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {productStatuses.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No products match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => (
                <TableRow key={product.sku}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border bg-muted">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.name}</p>
                        <p className="text-muted-foreground text-xs uppercase tabular-nums">
                          {product.sku}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.category}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <p className="font-medium">
                      Rs. {product.price.toLocaleString()}
                    </p>
                    {product.originalPrice ? (
                      <p
                        className={cn(
                          "text-muted-foreground text-xs line-through",
                          "tabular-nums"
                        )}
                      >
                        Rs. {product.originalPrice.toLocaleString()}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <StockBadge stock={product.stock} />
                  </TableCell>
                  <TableCell>
                    <ProductStatusBadge status={product.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${product.name}`}
                          >
                            <MoreHorizontalIcon />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="max-w-56 truncate">
                          {product.name}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          render={
                            <button type="button">
                              <PencilIcon className="size-4" />
                              Edit
                            </button>
                          }
                        />
                        <DropdownMenuItem
                          render={
                            <button type="button">
                              <CopyIcon className="size-4" />
                              Duplicate
                            </button>
                          }
                        />
                        <DropdownMenuItem
                          render={
                            <button type="button">
                              <EyeOffIcon className="size-4" />
                              {product.status === "Published"
                                ? "Unpublish"
                                : "Publish"}
                            </button>
                          }
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-muted-foreground text-sm">
        Showing {filtered.length} of {adminProducts.length} products
      </p>
    </div>
  );
}
