"use client";

import { useState } from "react";
import {
  EyeIcon,
  MoreHorizontalIcon,
  PackageIcon,
  XCircleIcon,
} from "lucide-react";

import { type RouterOutputs, trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import {
  DataTableEmpty,
  DataTableCell,
  DataTableHead,
  DataTableShell,
} from "@/features/admin/components/data-table";
import {
  GatewayBadge,
  OrderStatusBadge,
} from "@/features/admin/components/status-badge";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
} from "@/lib/admin-schema";

type AdminOrder = RouterOutputs["admin"]["listOrders"]["orders"][number];

function formatOrderDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function filterOrders(
  orders: AdminOrder[],
  filters: {
    query: string;
    status: string;
    gateway: string;
  }
) {
  const query = filters.query.trim().toLowerCase();

  return orders.filter((order) => {
    if (filters.status !== "all" && order.status !== filters.status) {
      return false;
    }
    if (filters.gateway !== "all" && order.paymentMethod !== filters.gateway) {
      return false;
    }
    if (!query) {
      return true;
    }

    return (
      order.id.toLowerCase().includes(query) ||
      order.shippingInfo.fullName.toLowerCase().includes(query) ||
      (order.user?.email ?? "").toLowerCase().includes(query)
    );
  });
}

export function OrdersTable() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [gateway, setGateway] = useState("all");

  const ordersQuery = trpc.admin.listOrders.useQuery({ limit: 100 });
  const orders = ordersQuery.data?.orders ?? [];
  const filtered = filterOrders(orders, { query, status, gateway });

  const isLoading = ordersQuery.isPending;
  const failed = ordersQuery.isError;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search orders, customers, emails…"
          className="w-full sm:max-w-xs"
          aria-label="Search orders"
        />
        <div className="flex flex-1 justify-start gap-2 sm:justify-end">
          <Select
            value={status}
            onValueChange={(value) => setStatus(value ?? "all")}
          >
            <SelectTrigger className="w-40" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ORDER_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {ORDER_STATUS_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={gateway}
            onValueChange={(value) => setGateway(value ?? "all")}
          >
            <SelectTrigger
              className="w-36"
              aria-label="Filter by payment gateway"
            >
              <SelectValue placeholder="All payments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              {PAYMENT_METHODS.map((option) => (
                <SelectItem key={option} value={option}>
                  {PAYMENT_METHOD_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead>Order</DataTableHead>
              <DataTableHead>Customer</DataTableHead>
              <DataTableHead className="text-right">Items</DataTableHead>
              <DataTableHead className="text-right">Amount</DataTableHead>
              <DataTableHead>Payment</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead>Date</DataTableHead>
              <DataTableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!!isLoading &&
              Array.from({ length: 6 }, (_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: loading placeholder rows
                <TableRow key={index}>
                  <DataTableCell colSpan={8}>
                    <Skeleton className="h-8" />
                  </DataTableCell>
                </TableRow>
              ))}

            {!isLoading && failed && (
              <DataTableEmpty colSpan={8}>
                Couldn't load orders. Refresh the page to try again.
              </DataTableEmpty>
            )}

            {!isLoading && !failed && filtered.length === 0 && (
              <DataTableEmpty colSpan={8}>
                No orders match your filters.
              </DataTableEmpty>
            )}

            {!isLoading &&
              !failed &&
              filtered.map((order) => (
                <TableRow key={order.id}>
                  <DataTableCell className="font-medium tabular-nums">
                    {order.id}
                  </DataTableCell>
                  <DataTableCell>
                    <p className="font-medium">
                      {order.shippingInfo.fullName || "Guest checkout"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {order.user?.email ?? "No account"}
                    </p>
                  </DataTableCell>
                  <DataTableCell className="text-right tabular-nums">
                    {order.items.length}
                  </DataTableCell>
                  <DataTableCell className="text-right font-medium tabular-nums">
                    Rs. {order.totalAmount.toLocaleString()}
                  </DataTableCell>
                  <DataTableCell>
                    <GatewayBadge gateway={order.paymentMethod} />
                  </DataTableCell>
                  <DataTableCell>
                    <OrderStatusBadge status={order.status} />
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {formatOrderDate(order.createdAt)}
                  </DataTableCell>
                  <DataTableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for order ${order.id}`}
                          >
                            <MoreHorizontalIcon />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={
                            <button type="button">
                              <EyeIcon className="size-4" />
                              View details
                            </button>
                          }
                        />
                        <DropdownMenuItem
                          render={
                            <button type="button">
                              <PackageIcon className="size-4" />
                              Mark as shipped
                            </button>
                          }
                        />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 dark:text-red-400"
                          render={
                            <button type="button">
                              <XCircleIcon className="size-4" />
                              Cancel order
                            </button>
                          }
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </DataTableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </DataTableShell>

      {!isLoading && !failed && (
        <p className="text-muted-foreground text-xs">
          Showing {filtered.length} of {orders.length} orders
        </p>
      )}
    </div>
  );
}
