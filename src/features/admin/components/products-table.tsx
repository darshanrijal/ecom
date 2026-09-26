"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { type RouterOutputs, trpc } from "@/__rpc/client";
import {
  DataTableEmpty,
  DataTableCell,
  DataTableHead,
  DataTableShell,
} from "./data-table";

type ProductRow = RouterOutputs["admin"]["products"]["list"]["items"][number];

const formatNPR = (value: number | null) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "NPR",
        maximumFractionDigits: 0,
      }).format(value);

function StatusBadge({ status }: { status: ProductRow["status"] }) {
  if (status === "Published") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600">Published</Badge>
    );
  }
  return <Badge className="bg-amber-500/10 text-amber-600">Draft</Badge>;
}

export function ProductsTable() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const categories = trpc.admin.categories.list.useQuery({});

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"" | "Published" | "Draft">("");
  const [showArchived, setShowArchived] = useState(false);

  const products = trpc.admin.products.list.useInfiniteQuery(
    {
      search: deferredSearch,
      categoryId: categoryId || undefined,
      status: status || undefined,
      showArchived,
      limit: 10,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const archiveProduct = trpc.admin.products.archive.useMutation();
  const restoreProduct = trpc.admin.products.restore.useMutation();
  const deleteProduct = trpc.admin.products.delete.useMutation();
  const [toDelete, setToDelete] = useState<ProductRow | null>(null);

  const rows = products.data?.pages.flatMap((page) => page.items) ?? [];

  const archive = async (row: ProductRow) => {
    await archiveProduct.mutateAsync({ id: row.id });
    await utils.admin.products.list.invalidate();
    toast.add({ title: `"${row.name}" archived`, type: "success" });
  };

  const restore = async (row: ProductRow) => {
    await restoreProduct.mutateAsync({ id: row.id });
    await utils.admin.products.list.invalidate();
    toast.add({ title: `"${row.name}" restored`, type: "success" });
  };

  const confirmDelete = async () => {
    if (!toDelete) {
      return;
    }
    try {
      await deleteProduct.mutateAsync({ id: toDelete.id });
      toast.add({
        title: `"${toDelete.name}" permanently deleted`,
        type: "success",
      });
      setToDelete(null);
    } catch (error) {
      toast.add({
        title: "Couldn't delete product",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      });
    }
    await utils.admin.products.list.invalidate();
    await utils.admin.categories.list.invalidate();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or SKU…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={categoryId}
            onValueChange={(value) => setCategoryId(value ?? "")}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All categories">
                {(value) =>
                  value
                    ? (categories.data?.find(
                        (category) => category.id === value
                      )?.name ?? value)
                    : "All categories"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {categories.data?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value ?? "")}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any status</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <label
            className="flex cursor-pointer items-center gap-2 text-sm"
            htmlFor="show-archived"
          >
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
              aria-label="Show archived products"
            />
            Archived
          </label>
          <Button size="sm" render={<Link href="/admin/products/new" />}>
            Add product
          </Button>
        </div>
      </div>

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead>Product</DataTableHead>
              <DataTableHead className="hidden md:table-cell">
                Category
              </DataTableHead>
              <DataTableHead className="text-right">Price</DataTableHead>
              <DataTableHead className="hidden text-right sm:table-cell">
                Stock
              </DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead className="text-right">Actions</DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <DataTableEmpty colSpan={6}>
                {products.isFetching
                  ? "Loading products…"
                  : "No products " +
                    (search || categoryId || status || showArchived
                      ? "match these filters."
                      : "yet — add your first one.")}
              </DataTableEmpty>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <DataTableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted font-medium text-xs">
                        {row.baseImage ? (
                          <Image
                            src={row.baseImage}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
                            className="size-full object-cover"
                          />
                        ) : (
                          row.name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.name}</p>
                        <p className="truncate text-muted-foreground text-xs">
                          {row.primarySku}
                        </p>
                      </div>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="hidden text-muted-foreground md:table-cell">
                    {row.category.name}
                  </DataTableCell>
                  <DataTableCell className="text-right font-medium">
                    {formatNPR(row.price)}
                  </DataTableCell>
                  <DataTableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                    {row.stock}
                  </DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={row.status} />
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${row.name}`}
                        onClick={() =>
                          router.push(`/admin/products/${row.id}/edit`)
                        }
                      >
                        <PencilIcon />
                      </Button>
                      {row.archivedAt ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Restore ${row.name}`}
                            onClick={() => restore(row)}
                          >
                            <ArchiveRestoreIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-red-600 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
                            aria-label={`Permanently delete ${row.name}`}
                            onClick={() => setToDelete(row)}
                          >
                            <Trash2Icon />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Archive ${row.name}`}
                          onClick={() => archive(row)}
                        >
                          <ArchiveIcon />
                        </Button>
                      )}
                    </div>
                  </DataTableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {products.hasNextPage ? (
          <div className="border-t p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => products.fetchNextPage()}
              disabled={products.isFetchingNextPage}
            >
              {products.isFetchingNextPage ? "Loading…" : "Show more"}
            </Button>
          </div>
        ) : null}
      </DataTableShell>

      <p className="text-muted-foreground text-xs">
        {rows.length} {rows.length === 1 ? "product" : "products"}
      </p>

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete this product?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? (
                <>
                  &quot;{toDelete.name}&quot;, its variants and inventory will
                  be permanently removed. This action can&apos;t be undone —
                  order history is kept but reference details are lost.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteProduct.isPending}
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
