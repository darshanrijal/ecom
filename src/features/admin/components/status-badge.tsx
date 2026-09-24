import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Gateway, OrderStatus } from "@/features/admin/data";

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  Pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Paid: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  Processing: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Shipped: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  Delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Cancelled: "bg-red-500/15 text-red-700 dark:text-red-400",
};

const GATEWAY_STYLES: Record<Gateway, string> = {
  eSewa: "bg-[#60BB46]/15 text-[#3d8f35] dark:text-[#7ed45f]",
  Khalti: "bg-[#5C2D91]/15 text-[#5C2D91] dark:text-[#b386e0]",
  COD: "bg-muted text-muted-foreground",
};

const PRODUCT_STATUS_STYLES: Record<"Published" | "Draft", string> = {
  Published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Draft: "bg-muted text-muted-foreground",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      className={cn("rounded-full font-medium", ORDER_STATUS_STYLES[status])}
    >
      {status}
    </Badge>
  );
}

export function GatewayBadge({ gateway }: { gateway: Gateway }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full font-medium", GATEWAY_STYLES[gateway])}
    >
      {gateway}
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
