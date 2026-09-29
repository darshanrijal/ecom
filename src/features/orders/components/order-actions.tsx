"use client";

import { useState } from "react";

import { trpc } from "@/__rpc/client";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/admin-schema";
import type { PaymentMethod } from "@/lib/order-schema";
import { cn } from "@/lib/utils";

/** The order shape both dialogs act on (list rows and getById share it). */
interface ActionableOrder {
  id: string;
  status: string;
  paymentMethod: PaymentMethod;
  paidAt: Date | null;
  totalAmount: number;
}

function shortId(id: string) {
  return `#${id.slice(-8).toUpperCase()}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function CancelOrderDialog({
  order,
  onClose,
}: {
  order: ActionableOrder;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const cancel = trpc.orders.cancel.useMutation();

  const paid = order.paidAt !== null;

  async function confirm() {
    try {
      await cancel.mutateAsync({ orderId: order.id });
      await utils.orders.list.invalidate();
      toast.add({
        title: `Order ${shortId(order.id)} cancelled`,
        description: paid
          ? `Refund of Rs. ${order.totalAmount.toLocaleString()} requested — follow its progress on this order.`
          : "Your order was cancelled.",
        type: "success",
      });
      onClose();
    } catch (error) {
      toast.add({
        title: "Couldn't cancel the order",
        description: errorMessage(error, "Something went wrong."),
        type: "error",
      });
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel order {shortId(order.id)}?</AlertDialogTitle>
          <AlertDialogDescription>
            The order stops immediately and the items go back to stock. This
            can&apos;t be undone.
            {paid ? (
              <>
                {" "}
                Rs. {order.totalAmount.toLocaleString()} was already paid — a
                refund for the full amount will be opened and shown on this
                order.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep order</AlertDialogCancel>
          <AlertDialogAction disabled={cancel.isPending} onClick={confirm}>
            {cancel.isPending ? "Cancelling…" : "Cancel order"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const PAYMENT_HINTS: Record<PaymentMethod, string> = {
  COD: "Pay cash when your order arrives",
  ESEWA: "Continue to eSewa to authorize the payment",
  KHALTI: "Continue to Khalti to authorize the payment",
};

export function ChangePaymentDialog({
  order,
  onClose,
}: {
  order: ActionableOrder;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const change = trpc.orders.changePaymentMethod.useMutation();
  const [selected, setSelected] = useState<PaymentMethod>(order.paymentMethod);

  async function submit() {
    try {
      await change.mutateAsync({
        orderId: order.id,
        paymentMethod: selected,
      });
      await Promise.all([
        utils.orders.list.invalidate(),
        utils.orders.getById.invalidate({ orderId: order.id }),
      ]);
      toast.add({
        title: `Payment method set to ${PAYMENT_METHOD_LABELS[selected]}`,
        type: "success",
      });
      onClose();
    } catch (error) {
      toast.add({
        title: "Couldn't change the payment method",
        description: errorMessage(error, "Something went wrong."),
        type: "error",
      });
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change payment method</DialogTitle>
          <DialogDescription>
            Order {shortId(order.id)} · Rs. {order.totalAmount.toLocaleString()}{" "}
            — pick how you&apos;d like to pay before the order is processed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setSelected(method)}
              aria-pressed={selected === method}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                selected === method
                  ? "border-primary bg-primary/5"
                  : "hover:bg-accent/50"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2",
                  selected === method
                    ? "border-primary"
                    : "border-muted-foreground/40"
                )}
              >
                {selected === method && (
                  <span className="size-2 rounded-full bg-primary" />
                )}
              </span>
              <span>
                <span className="block font-medium text-sm">
                  {PAYMENT_METHOD_LABELS[method]}
                </span>
                <span className="block text-muted-foreground text-xs">
                  {PAYMENT_HINTS[method]}
                </span>
              </span>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            type="button"
            disabled={change.isPending || selected === order.paymentMethod}
            onClick={submit}
          >
            {change.isPending ? "Saving…" : "Use this method"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
