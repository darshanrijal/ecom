"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/__rpc/client";
import { ProductForm } from "@/features/admin/components/product-form";

export default function AdminEditProductPage() {
  const params = useParams<{ id: string }>();
  const products = trpc.admin.products.get.useQuery({ id: params.id });

  if (products.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!products.data) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="font-bold text-2xl tracking-tight">Product not found</h1>
        <p className="text-muted-foreground text-sm">
          It may have been deleted, or the address is wrong.
        </p>
        <Button variant="outline" render={<Link href="/admin/products" />}>
          Back to products
        </Button>
      </div>
    );
  }

  return <ProductForm product={products.data} />;
}
