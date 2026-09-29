"use client";

import { format } from "date-fns";
import type { ReactNode } from "react";

import { type RouterOutputs, trpc } from "@/__rpc/client";
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
import {
  GatewayBadge,
  OrderStatusBadge,
  RefundStatusBadge,
} from "@/features/admin/components/status-badge";
import {
  REFUND_STATUS_LABELS,
  REFUND_TRANSITIONS,
  type AdminRefundStatus,
} from "@/lib/admin-schema";

type AdminOrder = RouterOutputs["admin"]["listOrders"]["orders"][number];

const REFUND_ACTION_LABELS: Record<AdminRefundStatus, string> = {
  PENDING: "Move back to pending",
  PROCESSING: "Mark as processing",
  REFUNDED: "Mark as refunded",
  FAILED: "Mark as failed",
};

function formatDateTime(value: Date | string) {
  return format(new Date(value), "d MMM yyyy, h:mm a");
}

function formatCoords(lat: number | null, lng: number | null) {
  return lat !== null && lng !== null
    ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    : "not set";
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="font-medium text-muted-foreground text-sm">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function MoneyRow({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function RefundSection({ order }: { order: AdminOrder }) {
  const utils = trpc.useUtils();
  const updateRefund = trpc.admin.updateRefundStatus.useMutation();
  const { refund } = order;

  async function setRefundStatus(status: AdminRefundStatus) {
    try {
      await updateRefund.mutateAsync({ orderId: order.id, status });
      await utils.admin.listOrders.invalidate();
      toast.add({
        title: `Refund marked ${REFUND_STATUS_LABELS[status].toLowerCase()}`,
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Couldn't update the refund",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      });
    }
  }

  if (refund === null) {
    if (order.paidAt === null) {
      return null;
    }
    return (
      <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
        <p className="font-medium text-amber-900 text-sm dark:text-amber-100">
          No refund recorded
        </p>
        <p className="mt-1 text-amber-800/80 text-xs dark:text-amber-200/80">
          This order was paid but carries no refund row yet — record one to
          start tracking the money return.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          disabled={updateRefund.isPending}
          onClick={() => setRefundStatus("PENDING")}
        >
          Record refund as pending
        </Button>
      </div>
    );
  }

  const actions = REFUND_TRANSITIONS[refund.status];

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RefundStatusBadge status={refund.status} />
          <span className="font-semibold text-sm tabular-nums">
            Rs. {refund.amount.toLocaleString()}
          </span>
        </div>
        <span className="text-muted-foreground text-xs">
          Opened {formatDateTime(refund.createdAt)}
        </span>
      </div>
      {!!refund.reason && (
        <p className="mt-2 text-muted-foreground text-xs">{refund.reason}</p>
      )}
      <p className="mt-1 text-muted-foreground text-xs">
        Last updated {formatDateTime(refund.updatedAt)}
      </p>

      {actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={status === "REFUNDED" ? "default" : "outline"}
              disabled={updateRefund.isPending}
              onClick={() => setRefundStatus(status)}
            >
              {REFUND_ACTION_LABELS[status]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Full order read-view. It re-queries the (deduped) list so refund/status
 * changes made from inside the dialog show up without closing it.
 */
export function OrderDetailDialog({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const ordersQuery = trpc.admin.listOrders.useQuery({ limit: 100 });
  const order = ordersQuery.data?.orders.find((entry) => entry.id === orderId);

  if (!order) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Order details</DialogTitle>
            <DialogDescription>
              This order is no longer in the list — it may have been removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const deliveryLabel = (
    <>
      Delivery
      {typeof order.deliveryDistanceKm === "number" ? (
        <span className="text-muted-foreground/70">
          {" "}
          · {order.deliveryDistanceKm} km
          {order.deliveryRatePerKm === null
            ? ""
            : ` × Rs. ${order.deliveryRatePerKm}/km`}
        </span>
      ) : null}
    </>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Order #{order.id.slice(-8).toUpperCase()}
            <OrderStatusBadge status={order.status} />
          </DialogTitle>
          <DialogDescription>
            Placed {formatDateTime(order.createdAt)} ·{" "}
            {order.shippingInfo.fullName || "Guest checkout"}
            {order.user ? ` · ${order.user.email}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4 text-sm">
              <p className="text-muted-foreground text-xs">Payment</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <GatewayBadge gateway={order.paymentMethod} />
                <span>
                  {order.paidAt
                    ? `Paid ${formatDateTime(order.paidAt)}`
                    : "Not paid yet"}
                </span>
              </div>
              {!!order.paymentRef && (
                <p className="mt-1 font-mono text-muted-foreground text-xs">
                  ref {order.paymentRef}
                </p>
              )}
            </div>
            <div className="rounded-xl border p-4 text-sm">
              <p className="text-muted-foreground text-xs">Delivery man</p>
              {order.deliveryMan ? (
                <>
                  <p className="mt-1.5 font-medium">{order.deliveryMan.name}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {order.deliveryMan.phone}
                  </p>
                </>
              ) : (
                <p className="mt-1.5 text-muted-foreground text-sm">
                  Unassigned
                </p>
              )}
            </div>
          </div>

          <Section title={`Items (${order.items.length})`}>
            <ul className="divide-y rounded-xl border">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.productName}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.skuCode} · Qty {item.quantity}
                    </p>
                  </div>
                  <span className="tabular-nums">
                    Rs. {item.totalPrice.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Amounts">
            <div className="space-y-1.5 rounded-xl border p-4">
              <MoneyRow
                label="Subtotal"
                value={`Rs. ${order.subtotal.toLocaleString()}`}
              />
              {order.discountAmount > 0 && (
                <MoneyRow
                  label="Discount"
                  value={`- Rs. ${order.discountAmount.toLocaleString()}`}
                />
              )}
              <MoneyRow
                label={deliveryLabel}
                value={
                  order.deliveryCharge > 0
                    ? `Rs. ${order.deliveryCharge.toLocaleString()}`
                    : "FREE"
                }
              />
              <div className="flex justify-between border-t pt-2 font-semibold text-sm">
                <span>Total</span>
                <span className="tabular-nums">
                  Rs. {order.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </Section>

          <Section title="Delivery address">
            <div className="rounded-xl border p-4 text-sm">
              <p>
                {order.shippingInfo.fullName} · {order.shippingInfo.phone}
              </p>
              <p className="text-muted-foreground">
                {order.shippingInfo.address}, {order.shippingInfo.city},{" "}
                {order.shippingInfo.province}
              </p>
              <p className="mt-1 text-muted-foreground text-xs tabular-nums">
                Drop-off{" "}
                {formatCoords(
                  order.shippingInfo.deliveryLat,
                  order.shippingInfo.deliveryLng
                )}
                {order.storeLat !== null && order.storeLng !== null
                  ? ` · Store ${formatCoords(order.storeLat, order.storeLng)}`
                  : ""}
              </p>
            </div>
          </Section>

          {(order.paidAt !== null || order.refund !== null) && (
            <Section title="Refund">
              <RefundSection order={order} />
            </Section>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
