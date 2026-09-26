"use client";

import { useState } from "react";
import type { OrderStatus } from "@/generated/prisma/enums";
import { type RouterOutputs, trpc } from "@/__rpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
} from "@/lib/admin-schema";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { PhoneIcon, UserIcon } from "lucide-react";

type AdminOrder = RouterOutputs["admin"]["listOrders"]["orders"][number];

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  PAID: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  PROCESSING: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  SHIPPED: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  DELIVERED: "bg-green-500/15 text-green-700 dark:text-green-400",
  CANCELLED: "bg-red-500/15 text-red-700 dark:text-red-400",
  REFUNDED: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400",
};

const FILTERS = ["ALL", ...ORDER_STATUSES] as const;
type Filter = (typeof FILTERS)[number];

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-4xl px-2 font-medium text-xs",
        STATUS_STYLES[status]
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

interface OrderCardProps {
  order: AdminOrder;
}

function OrderCard({ order }: OrderCardProps) {
  const utils = trpc.useUtils();
  const nextStatuses = ORDER_TRANSITIONS[order.status];

  const changeStatus = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: (result) => {
      toast.add({
        type: "success",
        title: `Order marked ${ORDER_STATUS_LABELS[result.status]}`,
      });
      utils.admin.listOrders.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Could not update order",
        description: error.message,
      });
    },
  });

  const shipping = order.shippingInfo;

  return (
    <article className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            <Badge variant="outline">{order.paymentMethod}</Badge>
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(order.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="font-semibold text-sm">
            {shipping.fullName}
            {!!order.user && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {order.user.email}
              </span>
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            {shipping.address}, {shipping.city}, {shipping.province}
          </p>
          <p className="flex items-center gap-1 text-muted-foreground text-xs">
            <PhoneIcon className="size-3" />
            {shipping.phone}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <p className="font-bold text-lg">
            Rs. {order.totalAmount.toLocaleString()}
          </p>
          {nextStatuses.length > 0 ? (
            <NativeSelect
              value=""
              aria-label={`Change status of order ${order.id}`}
              disabled={changeStatus.isPending}
              onChange={(event) => {
                if (!event.target.value) {
                  return;
                }
                changeStatus.mutate({
                  orderId: order.id,
                  status: event.target.value as OrderStatus,
                });
              }}
            >
              <NativeSelectOption value="">Change status…</NativeSelectOption>
              {nextStatuses.map((status) => (
                <NativeSelectOption key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <span className="text-muted-foreground text-xs">Final status</span>
          )}
          {!!changeStatus.isPending && <Spinner className="size-3.5" />}
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border/60 rounded-lg border bg-muted/20">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{item.productName}</span>
              <span className="shrink-0 text-muted-foreground text-xs">
                {item.skuCode} × {item.quantity}
              </span>
            </div>
            <span className="shrink-0">
              Rs. {item.totalPrice.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function AdminOrdersPanel() {
  const [filter, setFilter] = useState<Filter>("ALL");

  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.admin.listOrders.useInfiniteQuery(
    {
      limit: 20,
      status: filter === "ALL" ? undefined : filter,
    },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const orders = data?.pages.flatMap((page) => page.orders) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
          Orders
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Track orders and move them through fulfillment.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setFilter(entry)}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
              filter === entry
                ? "bg-primary text-primary-foreground"
                : "border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {entry === "ALL" ? "All" : ORDER_STATUS_LABELS[entry]}
          </button>
        ))}
      </div>

      {!!isPending && (
        <div className="space-y-4">
          {["a", "b", "c"].map((key) => (
            <Skeleton key={key} className="h-48 rounded-2xl" />
          ))}
        </div>
      )}

      {!isPending && isError && (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="font-medium">Could not load orders.</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Refresh the page to try again.
          </p>
        </div>
      )}

      {!isPending && !isError && orders.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <UserIcon className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No orders here.</p>
          <p className="mt-1 text-muted-foreground text-sm">
            {filter === "ALL"
              ? "New orders will show up as customers check out."
              : `No orders with the "${ORDER_STATUS_LABELS[filter as OrderStatus]}" status.`}
          </p>
        </div>
      )}

      {!isPending &&
        !isError &&
        orders.map((order) => <OrderCard key={order.id} order={order} />)}

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
