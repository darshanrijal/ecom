"use client";

import { useState } from "react";
import {
  EyeIcon,
  MoreHorizontalIcon,
  PackageIcon,
  XCircleIcon,
} from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminOrders,
  gateways,
  orderStatuses,
  type AdminOrder,
} from "@/features/admin/data";
import {
  GatewayBadge,
  OrderStatusBadge,
} from "@/features/admin/components/status-badge";

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
    if (filters.gateway !== "all" && order.gateway !== filters.gateway) {
      return false;
    }
    if (!query) {
      return true;
    }

    return (
      order.id.toLowerCase().includes(query) ||
      order.customer.toLowerCase().includes(query) ||
      order.email.toLowerCase().includes(query)
    );
  });
}

export function OrdersTable() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [gateway, setGateway] = useState("all");

  const filtered = filterOrders(adminOrders, { query, status, gateway });

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
              {orderStatuses.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
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
              {gateways.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  No orders match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium tabular-nums">
                    {order.id}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{order.customer}</p>
                    <p className="text-muted-foreground text-xs">
                      {order.email}
                    </p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {order.items}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    Rs. {order.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <GatewayBadge gateway={order.gateway} />
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.date}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-muted-foreground text-sm">
        Showing {filtered.length} of {adminOrders.length} orders
      </p>
    </div>
  );
}
