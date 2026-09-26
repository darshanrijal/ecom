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
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import {
  DataTableEmpty,
  DataTableCell,
  DataTableHead,
  DataTableShell,
} from "@/features/admin/components/data-table";
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
            {filtered.length === 0 ? (
              <DataTableEmpty colSpan={8}>
                No orders match your filters.
              </DataTableEmpty>
            ) : (
              filtered.map((order) => (
                <TableRow key={order.id}>
                  <DataTableCell className="font-medium tabular-nums">
                    {order.id}
                  </DataTableCell>
                  <DataTableCell>
                    <p className="font-medium">{order.customer}</p>
                    <p className="text-muted-foreground text-xs">
                      {order.email}
                    </p>
                  </DataTableCell>
                  <DataTableCell className="text-right tabular-nums">
                    {order.items}
                  </DataTableCell>
                  <DataTableCell className="text-right font-medium tabular-nums">
                    Rs. {order.amount.toLocaleString()}
                  </DataTableCell>
                  <DataTableCell>
                    <GatewayBadge gateway={order.gateway} />
                  </DataTableCell>
                  <DataTableCell>
                    <OrderStatusBadge status={order.status} />
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {order.date}
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
              ))
            )}
          </TableBody>
        </Table>
      </DataTableShell>

      <p className="text-muted-foreground text-xs">
        Showing {filtered.length} of {adminOrders.length} orders
      </p>
    </div>
  );
}
