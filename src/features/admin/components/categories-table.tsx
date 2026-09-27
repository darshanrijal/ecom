"use client";

import { useDeferredValue, useState } from "react";
import { PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";

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
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { type RouterOutputs, trpc } from "@/__rpc/client";
import {
  DataTableEmpty,
  DataTableCell,
  DataTableHead,
  DataTableShell,
} from "./data-table";
import type { CategoryFormValues } from "./category-form-dialog";

interface CategoriesTableProps {
  onAdd: () => void;
  onEdit: (category: CategoryFormValues) => void;
}

type CategoryRow = RouterOutputs["admin"]["categories"]["list"][number];

function rowToFormValues(row: CategoryRow): CategoryFormValues {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
  };
}

export function CategoriesTable({ onAdd, onEdit }: CategoriesTableProps) {
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [toDelete, setToDelete] = useState<CategoryRow | null>(null);

  const categories = trpc.admin.categories.list.useQuery({
    search: deferredSearch,
  });
  const deleteCategory = trpc.admin.categories.delete.useMutation();

  const rows = categories.data ?? [];

  const confirmDelete = async () => {
    if (!toDelete) {
      return;
    }
    try {
      await deleteCategory.mutateAsync({ id: toDelete.id });
      toast.add({
        title: `"${toDelete.name}" deleted`,
        type: "success",
      });
      setToDelete(null);
    } catch (error) {
      toast.add({
        title: "Couldn't delete category",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      });
    }
    await utils.admin.categories.list.invalidate();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search categories…"
            className="pl-9"
          />
        </div>
        <Button size="sm" onClick={onAdd}>
          <PlusIcon className="size-4" />
          Add category
        </Button>
      </div>

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead>Category</DataTableHead>
              <DataTableHead className="hidden md:table-cell">
                Slug
              </DataTableHead>
              <DataTableHead className="hidden lg:table-cell">
                Products
              </DataTableHead>
              <DataTableHead className="text-right">Actions</DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <DataTableEmpty colSpan={4}>
                {categories.isLoading
                  ? "Loading categories…"
                  : "No categories" +
                    (search
                      ? " match your search."
                      : " yet — create your first one.")}
              </DataTableEmpty>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <DataTableCell>
                    <p className="font-medium">{row.name}</p>
                    {row.description ? (
                      <p className="line-clamp-1 max-w-sm text-muted-foreground text-xs">
                        {row.description}
                      </p>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell className="hidden text-muted-foreground md:table-cell">
                    {row.slug}
                  </DataTableCell>
                  <DataTableCell className="hidden lg:table-cell">
                    <Badge variant="outline">
                      {row.productCount}{" "}
                      {row.productCount === 1 ? "product" : "products"}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${row.name}`}
                        onClick={() => onEdit(rowToFormValues(row))}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${row.name}`}
                        disabled={row.productCount > 0}
                        onClick={() => setToDelete(row)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </DataTableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableShell>

      <p className="text-muted-foreground text-xs">
        Categories with products are locked. Archive and then permanently delete
        their products (products → Archived) before deleting the category.
      </p>

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? (
                <>
                  &quot;{toDelete.name}&quot; will be permanently removed. This
                  action can&apos;t be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteCategory.isPending}
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
