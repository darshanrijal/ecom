"use client";

import { type RouterOutputs, trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ProductImage } from "@/features/products/components/product-image";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useOrderStore } from "@/stores/order-store";
import { format } from "date-fns";
import {
  ChevronDownIcon,
  CircleCheckBigIcon,
  ClockIcon,
  RefreshCwIcon,
  ShoppingBagIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Order = RouterOutputs["orders"]["list"][number];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  PAID: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  PROCESSING: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  SHIPPED: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  DELIVERED: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300",
  CANCELLED: "bg-red-500/15 text-red-700 dark:text-red-400",
  REFUNDED: "bg-muted text-muted-foreground",
};

const PAYMENT_LABELS: Record<string, string> = {
  COD: "Cash on Delivery",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 font-semibold text-[11px]",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {status}
    </span>
  );
}

function VerifyPaymentButton({ order }: { order: Order }) {
  const utils = trpc.useUtils();
  const verifyEsewa = trpc.orders.verifyEsewaPayment.useMutation({
    onSuccess: () => utils.orders.list.invalidate(),
  });
  const verifyKhalti = trpc.orders.verifyKhaltiPayment.useMutation({
    onSuccess: () => utils.orders.list.invalidate(),
  });
  const [note, setNote] = useState("");

  const isEsewa =
    order.paymentMethod === "ESEWA" && !!order.esewaTransactionUuid;
  const isKhalti = order.paymentMethod === "KHALTI" && !!order.khaltiPidx;

  if (!isEsewa && !isKhalti) {
    return null;
  }

  const walletName = isEsewa ? "eSewa" : "Khalti";
  const { isPending } = isEsewa ? verifyEsewa : verifyKhalti;

  async function handleVerify() {
    setNote("");
    try {
      const updated = isEsewa
        ? await verifyEsewa.mutateAsync({ orderId: order.id })
        : await verifyKhalti.mutateAsync({ orderId: order.id });
      setNote(
        updated.status === "PAID"
          ? "Payment confirmed — your order is now paid!"
          : `${walletName} hasn't confirmed the payment yet. Check back shortly.`
      );
    } catch (err) {
      setNote(
        err instanceof Error
          ? err.message
          : "Couldn't check the payment status. Please try again."
      );
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={handleVerify}
        disabled={isPending}
      >
        {isPending ? <Spinner /> : <RefreshCwIcon className="size-3.5" />}
        {isPending ? "Checking…" : "Already paid? Check payment status"}
      </Button>
      {!!note && <p className="text-xs opacity-80">{note}</p>}
    </div>
  );
}

function SuccessBanner({
  order,
  onDismiss,
}: {
  order: Order;
  onDismiss: () => void;
}) {
  const awaitingPayment =
    order.status === "PENDING" && order.paymentMethod !== "COD";

  let title = "Order placed successfully!";
  let detail = `Pay Rs. ${order.totalAmount.toLocaleString()} in cash when your order arrives.`;
  let Icon = CircleCheckBigIcon;

  if (order.status === "PAID") {
    title = "Payment successful!";
    detail = order.paymentRef
      ? `Rs. ${order.totalAmount.toLocaleString()} received · ref ${order.paymentRef}`
      : `Rs. ${order.totalAmount.toLocaleString()} received`;
  }

  if (awaitingPayment) {
    title = "Your order is saved — payment pending";
    detail = `Complete the Rs. ${order.totalAmount.toLocaleString()} payment to confirm your order.`;
    Icon = ClockIcon;
  }

  const tone = awaitingPayment
    ? "border-amber-300/60 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
    : "border-emerald-300/60 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100";

  return (
    <div
      className={cn("relative rounded-2xl border p-5 pr-12 shadow-xs", tone)}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="absolute top-4 right-4 rounded-full p-1 opacity-60 transition-opacity hover:opacity-100"
      >
        <XIcon className="size-4" />
      </button>

      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background/60">
          <Icon className="size-5" />
        </span>

        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm opacity-80">{detail}</p>
          <p className="mt-1 font-mono text-xs opacity-70">
            Order #{order.id.slice(-8).toUpperCase()}
          </p>

          {!!awaitingPayment && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                nativeButton={false}
                render={
                  <Link href={`/checkout/pay/${order.id}`}>
                    Complete payment
                  </Link>
                }
              />
              <VerifyPaymentButton order={order} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="flex flex-col items-center rounded-2xl border bg-card px-6 py-16 text-center shadow-xs">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <ShoppingBagIcon className="size-7 text-muted-foreground" />
      </div>
      <h2 className="mt-5 font-semibold text-lg">No orders yet</h2>
      <p className="mt-2 max-w-sm text-muted-foreground text-sm">
        When you place an order it will show up here with its status and payment
        details.
      </p>
      <Button
        className="mt-6"
        nativeButton={false}
        render={<Link href="/products">Start shopping</Link>}
      />
    </div>
  );
}

function OrderCard({
  order,
  defaultOpen,
}: {
  order: Order;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const awaitingPayment =
    order.status === "PENDING" && order.paymentMethod !== "COD";

  let paymentDetail = `Rs. ${order.totalAmount.toLocaleString()} due on delivery`;
  if (order.status === "PAID") {
    paymentDetail = order.paidAt
      ? `Paid on ${format(new Date(order.paidAt), "d MMM yyyy, h:mm a")}`
      : "Paid";
  }
  if (order.status === "PENDING" && order.paymentMethod !== "COD") {
    paymentDetail = `Awaiting ${
      order.paymentMethod === "ESEWA" ? "eSewa" : "Khalti"
    } payment`;
  }

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-accent/40"
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={order.status} />
          <span className="font-medium font-mono text-sm">
            #{order.id.slice(-8).toUpperCase()}
          </span>
          <span className="text-muted-foreground text-xs">
            {format(new Date(order.createdAt), "d MMM yyyy, h:mm a")}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm tabular-nums">
            Rs. {order.totalAmount.toLocaleString()}
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {!!open && (
        <div className="grid gap-6 border-t bg-muted/20 px-5 py-5 md:grid-cols-2">
          <div>
            <h3 className="font-medium text-sm">Items</h3>
            <ul className="mt-3 space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <ProductImage
                    src={item.imageUrl}
                    alt={item.productName}
                    className="size-12 shrink-0"
                    imageClassName="rounded-md border bg-background"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">
                      {item.productName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {item.skuCode} · Qty {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums">
                    Rs. {item.totalPrice.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm">Delivery address</h3>
              <p className="mt-1.5 text-sm">
                {order.shippingInfo.fullName} · {order.shippingInfo.phone}
              </p>
              <p className="text-muted-foreground text-sm">
                {order.shippingInfo.address}, {order.shippingInfo.city},{" "}
                {order.shippingInfo.province}
              </p>
              {!!order.shippingInfo.note && (
                <p className="mt-1 text-muted-foreground text-xs italic">
                  &ldquo;{order.shippingInfo.note}&rdquo;
                </p>
              )}
            </div>

            <div>
              <h3 className="font-medium text-sm">Payment</h3>
              <p className="mt-1.5 text-sm">
                {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
              </p>
              <p className="text-muted-foreground text-xs">{paymentDetail}</p>
            </div>

            <div className="space-y-1.5 border-t pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery</span>
                <span className="text-emerald-600">FREE</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular-nums">
                  Rs. {order.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!!awaitingPayment && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-amber-50 px-5 py-3 dark:bg-amber-500/10">
          <p className="text-amber-800 text-xs dark:text-amber-300">
            Payment pending — your order isn&apos;t confirmed yet.
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-8"
              nativeButton={false}
              render={
                <Link href={`/checkout/pay/${order.id}`}>Complete payment</Link>
              }
            />
            <VerifyPaymentButton order={order} />
          </div>
        </div>
      )}
    </article>
  );
}

interface OrdersClientPageProps {
  newOrderId?: string;
}

export function OrdersClientPage({ newOrderId }: OrdersClientPageProps) {
  const session = authClient.useSession();
  const isLoggedIn = !!session.data?.user;
  const guestOrderIds = useOrderStore((state) => state.orderIds);
  const [dismissed, setDismissed] = useState(false);

  const canQuery =
    !session.isPending && (isLoggedIn || guestOrderIds.length > 0);

  const { data, isPending } = trpc.orders.list.useQuery(
    { orderIds: guestOrderIds },
    { enabled: canQuery }
  );

  const loading = session.isPending || (canQuery && isPending);
  const orders = data ?? [];
  const newOrder = newOrderId
    ? orders.find((order) => order.id === newOrderId)
    : undefined;
  const showBanner = !!newOrder && !dismissed;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pt-6 pb-16 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
            My orders
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {loading
              ? "Loading your orders..."
              : `${orders.length} ${orders.length === 1 ? "order" : "orders"}`}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          nativeButton={false}
          render={<Link href="/products">Continue shopping</Link>}
        />
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {showBanner && newOrder ? (
            <SuccessBanner
              order={newOrder}
              onDismiss={() => setDismissed(true)}
            />
          ) : null}

          {orders.length === 0 ? (
            <EmptyOrders />
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                defaultOpen={order.id === newOrderId}
              />
            ))
          )}
        </div>
      )}
    </main>
  );
}
