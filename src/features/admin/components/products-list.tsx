"use client";

import Link from "next/link";
import { useState } from "react";
import { trpc } from "@/__rpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import {
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react";

function formatPrice(value: number | null) {
  return value === null ? "—" : `Rs. ${value.toLocaleString()}`;
}

export function AdminProductsList() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.admin.listProducts.useInfiniteQuery(
    { limit: 20, search: appliedSearch || undefined },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const products = data?.pages.flatMap((page) => page.products) ?? [];

  const togglePublish = trpc.admin.togglePublish.useMutation({
    onSuccess: (result) => {
      toast.add({
        type: "success",
        title: result.isPublished ? "Product published" : "Product unpublished",
      });
      utils.admin.listProducts.invalidate();
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Update failed",
        description: error.message,
      });
    },
  });

  const removeProduct = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => {
      toast.add({ type: "success", title: "Product deleted" });
      setPendingDeleteId(null);
      utils.admin.listProducts.invalidate();
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Delete failed",
        description: error.message,
      });
      setPendingDeleteId(null);
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
            Products
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {products.length} product{products.length === 1 ? "" : "s"} shown
            {!!appliedSearch && ` for “${appliedSearch}”`}
          </p>
        </div>
        <Button
          nativeButton={false}
          render={
            <Link href="/admin/products/new">
              <PlusIcon className="size-4" />
              New product
            </Link>
          }
        />
      </div>

      <form
        className="flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedSearch(searchInput.trim());
        }}
      >
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name or slug…"
          aria-label="Search products"
        />
        <Button type="submit" variant="outline" size="icon-sm">
          <SearchIcon className="size-4" />
        </Button>
      </form>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">SKUs</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!!isPending &&
              Array.from({ length: 5 }, (_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: loading placeholder rows
                <TableRow key={index}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8" />
                  </TableCell>
                </TableRow>
              ))}

            {!isPending && isError && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <p className="font-medium">Could not load products.</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Refresh the page to try again.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {!isPending && !isError && products.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <p className="font-medium">No products found.</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {appliedSearch
                      ? "Try a different search term."
                      : "Create your first product to get started."}
                  </p>
                </TableCell>
              </TableRow>
            )}

            {!isPending &&
              !isError &&
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted/40">
                        {/* biome-ignore lint/performance/noImgElement: admin thumbnail of arbitrary hosted URLs */}
                        <img
                          src={product.baseImage}
                          alt=""
                          width={40}
                          height={40}
                          className="size-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm">
                          {product.name}
                        </p>
                        <p className="truncate text-muted-foreground text-xs">
                          /{product.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category.name}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatPrice(product.minPrice)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {product.totalStock}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {product.skuCount}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.isPublished}
                      size="sm"
                      aria-label={`Publish ${product.name}`}
                      onCheckedChange={() =>
                        togglePublish.mutate({ productId: product.id })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Open ${product.name} on the store`}
                        nativeButton={false}
                        render={
                          <Link href={`/products/${product.slug}`}>
                            <EyeIcon className="size-4" />
                          </Link>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${product.name}`}
                        nativeButton={false}
                        render={
                          <Link href={`/admin/products/${product.id}`}>
                            <PencilIcon className="size-4" />
                          </Link>
                        }
                      />
                      {pendingDeleteId === product.id ? (
                        <>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={removeProduct.isPending}
                            onClick={() =>
                              removeProduct.mutate({ productId: product.id })
                            }
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDeleteId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          aria-label={`Delete ${product.name}`}
                          onClick={() => setPendingDeleteId(product.id)}
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {!!hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {!!isFetchingNextPage && <Spinner />}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
