import Link from "next/link";
import Image from "next/image";
import {
  NepaliRupeeIcon,
  ReceiptTextIcon,
  ShoppingCartIcon,
  StoreIcon,
  UsersIcon,
} from "lucide-react";

import { api } from "@/__rpc/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/features/admin/components/page-header";
import { StatCard } from "@/features/admin/components/stat-card";
import { RevenueChart } from "@/features/admin/components/revenue-chart";
import {
  GatewayBadge,
  OrderStatusBadge,
} from "@/features/admin/components/status-badge";

function formatOrderDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminDashboardPage() {
  const [stats, recent] = await Promise.all([
    api.admin.stats(),
    api.admin.listOrders({ limit: 6 }),
  ]);

  const statCards = [
    {
      label: "Total revenue",
      value: `Rs. ${stats.orders.revenue.toLocaleString()}`,
      delta: stats.deltas.revenue,
      caption: "vs. last month",
      icon: NepaliRupeeIcon,
    },
    {
      label: "Total orders",
      value: stats.orders.total.toLocaleString(),
      delta: stats.deltas.orders,
      caption: "vs. last month",
      icon: ShoppingCartIcon,
    },
    {
      label: "Customers",
      value: stats.customers.toLocaleString(),
      delta: null,
      caption: "with at least one order",
      icon: UsersIcon,
    },
    {
      label: "Avg. order value",
      value: `Rs. ${Math.round(stats.orders.avgOrderValue).toLocaleString()}`,
      delta: stats.deltas.avgOrderValue,
      caption: "vs. last month",
      icon: ReceiptTextIcon,
    },
  ];

  return (
    <>
      <PageHeader
        title="Admin Board"
        description="Welcome back to the admin board — here's what's happening across your store today."
      >
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link href="/">
              <StoreIcon className="size-4" />
              View store
            </Link>
          }
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Revenue overview</CardTitle>
            <CardDescription>
              Monthly revenue for the last 12 months
            </CardDescription>
          </div>
          <span className="text-muted-foreground text-sm">Last 12 months</span>
        </CardHeader>
        <CardContent>
          <RevenueChart data={stats.revenueSeries} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-xs lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Recent orders</CardTitle>
              <CardDescription>
                The latest orders placed on your store
              </CardDescription>
            </div>
            <Button
              variant="link"
              size="sm"
              nativeButton={false}
              className="text-muted-foreground"
              render={<Link href="/admin/orders">View all</Link>}
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Payment
                  </TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground text-sm"
                    >
                      No orders yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium tabular-nums">
                        {order.id}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {order.shippingInfo.fullName ||
                            order.user?.email ||
                            "Guest checkout"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatOrderDate(order.createdAt)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        Rs. {order.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <GatewayBadge gateway={order.paymentMethod} />
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Top products</CardTitle>
              <CardDescription>Best sellers by units sold</CardDescription>
            </div>
            <Button
              variant="link"
              size="sm"
              nativeButton={false}
              className="text-muted-foreground"
              render={<Link href="/admin/products">View all</Link>}
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {stats.topProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No sales yet.</p>
            ) : (
              stats.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="w-4 text-center font-medium text-muted-foreground text-xs tabular-nums">
                    {index + 1}
                  </span>
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">
                      {product.name}
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {product.sold} sold
                    </p>
                  </div>
                  <p className="shrink-0 font-medium text-sm tabular-nums">
                    Rs. {product.revenue.toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
