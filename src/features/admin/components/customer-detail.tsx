"use client";

import Image from "next/image";
import {
  BadgeCheckIcon,
  MapPinIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  WalletIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import type { RouterOutputs } from "@/__rpc/client";
import {
  DataTableEmpty,
  DataTableCell,
  DataTableHead,
  DataTableShell,
} from "./data-table";
import { OrderStatusBadge } from "./status-badge";

type CustomerDetailData = NonNullable<
  RouterOutputs["admin"]["customers"]["detail"]
>;

const formatNPR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);

export function CustomerDetail({ data }: { data: CustomerDetailData }) {
  const {
    name,
    email,
    image,
    emailVerified,
    isAdmin,
    createdAt,
    orders,
    addresses,
    totalSpent,
    lastOrderAt,
  } = data;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card size="sm" className="h-fit shadow-xs">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-medium">
              {image ? (
                <Image
                  src={image}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  className="size-full object-cover"
                />
              ) : (
                name.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-base">{name}</p>
              <p className="truncate text-muted-foreground text-xs">{email}</p>
            </div>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="flex items-center gap-1.5">
                {emailVerified ? (
                  <BadgeCheckIcon className="size-4 text-emerald-600" />
                ) : null}
                {emailVerified ? "Verified" : "Unverified"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Joined</dt>
              <dd>{formatDate(createdAt)}</dd>
            </div>
            {isAdmin ? (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Role</dt>
                <dd>Administrator</dd>
              </div>
            ) : null}
          </dl>

          {addresses.length > 0 ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                <MapPinIcon className="size-3.5" />
                Addresses
              </p>
              {addresses.map((address) => (
                <p key={address.id} className="text-sm">
                  {address.address}, {address.zone}, {address.city},{" "}
                  {address.province}
                </p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-6 lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card size="sm" className="shadow-xs">
            <CardContent>
              <p className="flex items-center gap-2 text-muted-foreground text-sm">
                <ShoppingBagIcon className="size-4" />
                Orders
              </p>
              <p className="mt-2 font-bold text-2xl tracking-tight">
                {orders.length}
              </p>
            </CardContent>
          </Card>
          <Card size="sm" className="shadow-xs">
            <CardContent>
              <p className="flex items-center gap-2 text-muted-foreground text-sm">
                <WalletIcon className="size-4" />
                Lifetime value
              </p>
              <p className="mt-2 font-bold text-2xl tracking-tight">
                {formatNPR(totalSpent)}
              </p>
            </CardContent>
          </Card>
          <Card size="sm" className="shadow-xs">
            <CardContent>
              <p className="flex items-center gap-2 text-muted-foreground text-sm">
                <ReceiptIcon className="size-4" />
                Last order
              </p>
              <p className="mt-2 font-bold text-2xl tracking-tight">
                {lastOrderAt ? formatDate(lastOrderAt) : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <DataTableHead>Order</DataTableHead>
                <DataTableHead>Date</DataTableHead>
                <DataTableHead>Status</DataTableHead>
                <DataTableHead className="text-right">Items</DataTableHead>
                <DataTableHead className="text-right">Total</DataTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <DataTableEmpty colSpan={5}>
                  This customer hasn&apos;t placed any orders yet.
                </DataTableEmpty>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <DataTableCell className="font-medium">
                      #{order.id.slice(-6).toUpperCase()}
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </DataTableCell>
                    <DataTableCell>
                      <OrderStatusBadge status={order.status} />
                    </DataTableCell>
                    <DataTableCell className="text-right tabular-nums">
                      {order.itemCount}
                    </DataTableCell>
                    <DataTableCell className="text-right font-medium">
                      {formatNPR(order.totalAmount)}
                    </DataTableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>
    </div>
  );
}
