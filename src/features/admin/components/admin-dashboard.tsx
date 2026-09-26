"use client";

import Link from "next/link";
import { trpc } from "@/__rpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { ORDER_STATUS_LABELS } from "@/lib/admin-schema";
import type { OrderStatus } from "@/generated/prisma/enums";
import {
  BoxesIcon,
  DollarSignIcon,
  PackageIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UsersIcon,
} from "lucide-react";

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">{label}</p>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
      </div>
      <p className="mt-2 font-bold text-2xl tracking-tight">{value}</p>
      {!!hint && <p className="mt-1 text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

export function AdminDashboard() {
  const { data, isPending, isError, refetch } = trpc.admin.stats.useQuery();

  const sweep = trpc.admin.sweepImages.useMutation({
    onSuccess: (result) => {
      toast.add({
        type: "success",
        title: "Storage cleaned",
        description: `Scanned ${result.scanned} files, deleted ${result.deleted} unused.`,
      });
      refetch();
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Sweep failed",
        description: error.message,
      });
    },
  });

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["a", "b", "c", "d"].map((key) => (
            <Skeleton key={key} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="font-medium">Could not load the dashboard.</p>
        <p className="mt-1 text-muted-foreground text-sm">
          Something went wrong while talking to the server.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const storagePercent =
    data.storage && data.storage.limitBytes > 0
      ? Math.min(100, (data.storage.totalBytes / data.storage.limitBytes) * 100)
      : null;

  const statusEntries = Object.entries(data.orders.byStatus) as [
    OrderStatus,
    number,
  ][];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Store overview at a glance.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={
            <Link href="/admin/products/new">
              <PlusIcon className="size-4" />
              New product
            </Link>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Products"
          value={String(data.products.total)}
          hint={`${data.products.published} published · ${data.products.drafts} drafts`}
          icon={<PackageIcon className="size-4" />}
        />
        <StatCard
          label="SKUs"
          value={String(data.products.skus)}
          hint={`${data.products.outOfStock} out of stock`}
          icon={<BoxesIcon className="size-4" />}
        />
        <StatCard
          label="Orders"
          value={String(data.orders.total)}
          hint={`${data.orders.byStatus.PENDING ?? 0} pending · ${
            data.orders.byStatus.PROCESSING ?? 0
          } processing`}
          icon={<SparklesIcon className="size-4" />}
        />
        <StatCard
          label="Revenue"
          value={`Rs. ${data.orders.revenue.toLocaleString()}`}
          hint={`${data.customers} customers`}
          icon={<DollarSignIcon className="size-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-lg">Orders by status</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              nativeButton={false}
              render={<Link href="/admin/orders">Manage orders</Link>}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {statusEntries.length === 0 && (
              <p className="text-muted-foreground text-sm">No orders yet.</p>
            )}
            {statusEntries.map(([status, count]) => (
              <Badge key={status} variant="outline" className="gap-1.5">
                {ORDER_STATUS_LABELS[status]}
                <span className="font-semibold text-primary">{count}</span>
              </Badge>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-lg">Image storage</h2>
            <Button
              variant="outline"
              size="sm"
              disabled={sweep.isPending}
              onClick={() => sweep.mutate()}
            >
              {sweep.isPending ? <Spinner /> : <TrashIcon className="size-4" />}
              {sweep.isPending ? "Sweeping…" : "Sweep unused images"}
            </Button>
          </div>

          {data.storage ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatBytes(data.storage.totalBytes)} used
                </span>
                <span className="text-muted-foreground">
                  {formatBytes(data.storage.limitBytes)} limit
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${storagePercent ?? 0}%` }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {data.storage.filesUploaded} files on UploadThing. The sweep
                deletes hosted images that no product, SKU or avatar uses.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-muted-foreground text-sm">
              Storage usage is unavailable right now.
            </p>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/admin/products">
              <PackageIcon className="size-4" />
              Manage products
            </Link>
          }
        />
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/admin/orders">
              <UsersIcon className="size-4" />
              Customer orders
            </Link>
          }
        />
      </div>
    </div>
  );
}
