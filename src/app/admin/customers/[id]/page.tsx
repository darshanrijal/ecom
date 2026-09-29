"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/__rpc/client";
import { CustomerDetail } from "@/features/admin/components/customer-detail";

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customer = trpc.admin.customers.detail.useQuery({ id: params.id });

  if (customer.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl lg:col-span-1" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!customer.data) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="font-bold text-2xl tracking-tight">
          Customer not found
        </h1>
        <p className="text-muted-foreground text-sm">
          This account may have been deleted, or the address is wrong.
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/admin/customers" />}
        >
          Back to customers
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">
            {customer.data.name}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {customer.data.email}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/admin/customers" />}
        >
          Back to customers
        </Button>
      </div>
      <CustomerDetail data={customer.data} />
    </div>
  );
}
