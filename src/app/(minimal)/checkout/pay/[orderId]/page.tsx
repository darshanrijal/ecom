import { api, HydrateClient } from "@/__rpc/server";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCardIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PayClient } from "./page.client";

export default async function PayPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  api.orders.getById.prefetch({ orderId });

  return (
    <HydrateClient>
      <Suspense fallback={<PayFallback />}>
        <ErrorBoundary fallback={<PayError />}>
          <PayClient orderId={orderId} />
        </ErrorBoundary>
      </Suspense>
    </HydrateClient>
  );
}

function PayFallback() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-md px-4 py-10">
      <span className="sr-only">Loading payment...</span>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="mt-4 h-12 w-full rounded-xl" />
      <Skeleton className="mt-3 h-12 w-full rounded-xl" />
    </main>
  );
}

function PayError() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-muted/60 to-background px-4">
      <div
        role="alert"
        className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-lg"
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
          <CreditCardIcon className="size-6 text-muted-foreground" />
        </div>
        <h1 className="mt-4 font-semibold text-lg">Payment page unavailable</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          This payment link is invalid or the order no longer exists.
        </p>
        <Button
          className="mt-6 w-full"
          nativeButton={false}
          render={<Link href="/orders">Go to my orders</Link>}
        />
      </div>
    </main>
  );
}
