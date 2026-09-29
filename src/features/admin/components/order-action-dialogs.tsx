"use client";

import { useState } from "react";
import Link from "next/link";

import { type RouterOutputs, trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import {
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
  PAYMENT_METHOD_LABELS,
  type AdminOrderStatus,
} from "@/lib/admin-schema";

type AdminOrder = RouterOutputs["admin"]["listOrders"]["orders"][number];

function describeOrder(order: AdminOrder) {
  return `${order.id} · ${
    order.shippingInfo.fullName || "Guest checkout"
  } · ${ORDER_STATUS_LABELS[order.status]}`;
}

function useInvalidateOrders() {
  const utils = trpc.useUtils();
  return () => utils.admin.listOrders.invalidate();
}

export function OrderAssignDialog({
  order,
  onClose,
}: {
  order: AdminOrder;
  onClose: () => void;
}) {
  const invalidateOrders = useInvalidateOrders();
  const menQuery = trpc.admin.delivery.listMen.useQuery();
  const assign = trpc.admin.delivery.assign.useMutation();

  const men = menQuery.data ?? [];
  const activeMen = men.filter((man) => man.isActive);
  const [selected, setSelected] = useState(order.deliveryMan?.id ?? "");

  const currentMan = order.deliveryMan;
  const unchanged = selected === "" || selected === currentMan?.id;

  async function submit(deliveryManId: string | null) {
    try {
      await assign.mutateAsync({ orderId: order.id, deliveryManId });
      await invalidateOrders();
      toast.add({
        title: deliveryManId ? "Delivery man assigned" : "Assignment cleared",
        type: "success",
      });
      onClose();
    } catch (error) {
      toast.add({
        title: "Couldn't update assignment",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      });
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign delivery man</DialogTitle>
          <DialogDescription>{describeOrder(order)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {men.length === 0 ? (
            <div className="rounded-xl border bg-muted/40 p-4 text-muted-foreground text-sm">
              <p>No delivery men yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                nativeButton={false}
                render={
                  <Link href="/admin/delivery-men">
                    Add a delivery man first
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <p className="font-medium text-sm">Delivery man</p>
                <Select
                  value={selected}
                  onValueChange={(value) => setSelected(value ?? "")}
                >
                  <SelectTrigger className="w-full" aria-label="Delivery man">
                    <SelectValue placeholder="Pick a delivery man" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMen.map((man) => (
                      <SelectItem key={man.id} value={man.id}>
                        {man.name} · {man.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentMan && currentMan.id !== selected ? (
                  <p className="text-muted-foreground text-xs">
                    Currently assigned to {currentMan.name}.
                  </p>
                ) : null}
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                {currentMan ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={assign.isPending}
                    onClick={() => submit(null)}
                  >
                    Unassign
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  type="button"
                  disabled={assign.isPending || unchanged || selected === ""}
                  onClick={() => submit(selected)}
                >
                  {assign.isPending ? "Assigning…" : "Assign"}
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function OrderStatusDialog({
  order,
  onClose,
}: {
  order: AdminOrder;
  onClose: () => void;
}) {
  const invalidateOrders = useInvalidateOrders();
  const updateStatus = trpc.admin.updateOrderStatus.useMutation();

  const nextStatuses = ORDER_TRANSITIONS[order.status];
  const [selected, setSelected] = useState<AdminOrderStatus | "">(
    nextStatuses[0] ?? ""
  );

  async function submit() {
    if (selected === "") {
      return;
    }
    try {
      await updateStatus.mutateAsync({ orderId: order.id, status: selected });
      await invalidateOrders();
      toast.add({
        title: `Order marked ${ORDER_STATUS_LABELS[selected].toLowerCase()}`,
        type: "success",
      });
      onClose();
    } catch (error) {
      toast.add({
        title: "Couldn't change status",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      });
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change status</DialogTitle>
          <DialogDescription>{describeOrder(order)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {nextStatuses.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              This order is in a final state — there are no further status
              changes.
            </p>
          ) : (
            <>
              <div className="grid gap-2">
                <p className="font-medium text-sm">Move to</p>
                <Select
                  value={selected}
                  onValueChange={(value) =>
                    setSelected((value as AdminOrderStatus) || "")
                  }
                >
                  <SelectTrigger className="w-full" aria-label="New status">
                    <SelectValue placeholder="Pick a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {nextStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {ORDER_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClose()}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={updateStatus.isPending || selected === ""}
                  onClick={submit}
                >
                  {updateStatus.isPending ? "Saving…" : "Change status"}
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function OrderCancelDialog({
  order,
  onClose,
}: {
  order: AdminOrder;
  onClose: () => void;
}) {
  const invalidateOrders = useInvalidateOrders();
  const updateStatus = trpc.admin.updateOrderStatus.useMutation();

  const paid = order.paidAt !== null;
  const gateway = PAYMENT_METHOD_LABELS[order.paymentMethod];

  async function confirm() {
    try {
      await updateStatus.mutateAsync({
        orderId: order.id,
        status: "CANCELLED",
      });
      await invalidateOrders();
      toast.add({
        title: "Order cancelled",
        description: paid
          ? `Refund of Rs. ${order.totalAmount.toLocaleString()} is now pending.`
          : "Items were returned to stock.",
        type: "success",
      });
      onClose();
    } catch (error) {
      toast.add({
        title: "Couldn't cancel the order",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      });
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
          <AlertDialogDescription>
            {describeOrder(order)} — the items go back to stock and the order
            can&apos;t be reopened.
            {paid ? (
              <>
                {" "}
                Rs. {order.totalAmount.toLocaleString()} was already paid via{" "}
                {gateway}, so a refund will be opened for the full amount.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep order</AlertDialogCancel>
          <AlertDialogAction
            disabled={updateStatus.isPending}
            onClick={confirm}
          >
            {updateStatus.isPending ? "Cancelling…" : "Cancel order"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
