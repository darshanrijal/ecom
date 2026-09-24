import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  IndianRupeeIcon,
  ReceiptTextIcon,
  ShoppingCartIcon,
  StoreIcon,
  UsersIcon,
} from "lucide-react";

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
import { adminOrders, adminStats, topProducts } from "@/features/admin/data";

const statIcons: Record<
  string,
  { icon: LucideIcon; tone: "emerald" | "sky" | "purple" | "amber" }
> = {
  "Total revenue": { icon: IndianRupeeIcon, tone: "emerald" },
  "Total orders": { icon: ShoppingCartIcon, tone: "sky" },
  Customers: { icon: UsersIcon, tone: "purple" },
  "Avg. order value": { icon: ReceiptTextIcon, tone: "amber" },
};

const recentOrders = adminOrders.slice(0, 6);

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome back — here's what's happening across your store today."
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
        {adminStats.map((stat) => {
          const { icon, tone } = statIcons[stat.label] ?? {
            icon: IndianRupeeIcon,
            tone: "emerald",
          };
          return (
            <StatCard key={stat.label} {...stat} icon={icon} tone={tone} />
          );
        })}
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
          <RevenueChart />
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
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium tabular-nums">
                      {order.id}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{order.customer}</p>
                      <p className="text-muted-foreground text-xs">
                        {order.date}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      Rs. {order.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <GatewayBadge gateway={order.gateway} />
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
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
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-3">
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
                  <p className="truncate font-medium text-sm">{product.name}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {product.sold} sold
                  </p>
                </div>
                <p className="shrink-0 font-medium text-sm tabular-nums">
                  Rs. {product.revenue.toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
