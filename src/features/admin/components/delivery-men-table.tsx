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
import type { DeliveryManFormValues } from "./delivery-man-form-dialog";

interface DeliveryMenTableProps {
  onAdd: () => void;
  onEdit: (deliveryMan: DeliveryManFormValues) => void;
}

type DeliveryManRow = RouterOutputs["admin"]["delivery"]["listMen"][number];

export function DeliveryMenTable({ onAdd, onEdit }: DeliveryMenTableProps) {
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [toDelete, setToDelete] = useState<DeliveryManRow | null>(null);

  const menQuery = trpc.admin.delivery.listMen.useQuery();
  const setActive = trpc.admin.delivery.setActive.useMutation();
  const deleteMan = trpc.admin.delivery.deleteMan.useMutation();

  const query = deferredSearch.trim().toLowerCase();
  const rows = (menQuery.data ?? []).filter((man) =>
    query
      ? man.name.toLowerCase().includes(query) ||
        man.phone.toLowerCase().includes(query) ||
        (man.accountEmail ?? "").toLowerCase().includes(query)
      : true
  );

  async function toggleActive(man: DeliveryManRow) {
    try {
      await setActive.mutateAsync({
        id: man.id,
        isActive: !man.isActive,
      });
      toast.add({
        title: man.isActive
          ? `"${man.name}" deactivated`
          : `"${man.name}" activated`,
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Couldn't update delivery man",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      });
    }
    await utils.admin.delivery.listMen.invalidate();
  }

  async function confirmDelete() {
    if (!toDelete) {
      return;
    }
    try {
      await deleteMan.mutateAsync({ id: toDelete.id });
      toast.add({
        title: `"${toDelete.name}" deleted`,
        type: "success",
      });
      setToDelete(null);
    } catch (error) {
      toast.add({
        title: "Couldn't delete delivery man",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      });
    }
    await utils.admin.delivery.listMen.invalidate();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search delivery men…"
            className="pl-9"
          />
        </div>
        <Button size="sm" onClick={onAdd}>
          <PlusIcon className="size-4" />
          Add delivery man
        </Button>
      </div>

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead>Name</DataTableHead>
              <DataTableHead>Phone</DataTableHead>
              <DataTableHead className="hidden md:table-cell">
                Account
              </DataTableHead>
              <DataTableHead className="hidden md:table-cell">
                Orders
              </DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead className="text-right">Actions</DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <DataTableEmpty colSpan={6}>
                {menQuery.isLoading
                  ? "Loading delivery men…"
                  : "No delivery men" +
                    (search
                      ? " match your search."
                      : " yet — add your first one.")}
              </DataTableEmpty>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <DataTableCell className="font-medium">
                    {row.name}
                  </DataTableCell>
                  <DataTableCell className="tabular-nums">
                    {row.phone}
                  </DataTableCell>
                  <DataTableCell className="hidden text-muted-foreground md:table-cell">
                    {row.accountEmail ?? "—"}
                  </DataTableCell>
                  <DataTableCell className="hidden md:table-cell">
                    <Badge variant="outline">
                      {row.assignedOrders}{" "}
                      {row.assignedOrders === 1 ? "order" : "orders"}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge
                      variant={row.isActive ? "default" : "secondary"}
                      className={
                        row.isActive
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : ""
                      }
                    >
                      {row.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${row.name}`}
                        onClick={() =>
                          onEdit({
                            id: row.id,
                            name: row.name,
                            phone: row.phone,
                            accountEmail: row.accountEmail ?? "",
                          })
                        }
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(row)}
                      >
                        {row.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${row.name}`}
                        disabled={row.assignedOrders > 0}
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
        Delivery men with assigned orders can be deactivated but not deleted, so
        order history stays intact.
      </p>

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this delivery man?</AlertDialogTitle>
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
              disabled={deleteMan.isPending}
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
