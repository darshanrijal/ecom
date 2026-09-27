import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type AdminOrderStatus,
  type AdminPaymentMethod,
} from "@/lib/admin-schema";

const ORDER_STATUS_STYLES: Record<AdminOrderStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  PAID: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  PROCESSING: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  SHIPPED: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  DELIVERED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  CANCELLED: "bg-red-500/15 text-red-700 dark:text-red-400",
  REFUNDED: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400",
};

const GATEWAY_STYLES: Record<AdminPaymentMethod, string> = {
  ESEWA: "bg-[#60BB46]/15 text-[#3d8f35] dark:text-[#7ed45f]",
  KHALTI: "bg-[#5C2D91]/15 text-[#5C2D91] dark:text-[#b386e0]",
  COD: "bg-muted text-muted-foreground",
};

const PRODUCT_STATUS_STYLES: Record<"Published" | "Draft", string> = {
  Published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Draft: "bg-muted text-muted-foreground",
};

export function OrderStatusBadge({ status }: { status: AdminOrderStatus }) {
  return (
    <Badge
      className={cn("rounded-full font-medium", ORDER_STATUS_STYLES[status])}
    >
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function GatewayBadge({ gateway }: { gateway: AdminPaymentMethod }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full font-medium", GATEWAY_STYLES[gateway])}
    >
      {PAYMENT_METHOD_LABELS[gateway]}
    </Badge>
  );
}

export function ProductStatusBadge({
  status,
}: {
  status: "Published" | "Draft";
}) {
  return (
    <Badge
      className={cn("rounded-full font-medium", PRODUCT_STATUS_STYLES[status])}
    >
      {status}
    </Badge>
  );
}
