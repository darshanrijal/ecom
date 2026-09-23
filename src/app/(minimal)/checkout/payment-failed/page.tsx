import { Button } from "@/components/ui/button";
import { AlertCircleIcon } from "lucide-react";
import Link from "next/link";

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-muted/60 to-background px-4">
      <div
        role="alert"
        className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-lg"
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/10">
          <AlertCircleIcon className="size-6 text-red-500" />
        </div>

        <h1 className="mt-4 font-semibold text-lg">Payment not completed</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          The eSewa payment was cancelled, failed, or is still processing. Your
          order is safely saved — nothing has been charged.
        </p>

        <div className="mt-6 space-y-2.5">
          {orderId ? (
            <>
              <Button
                className="w-full"
                nativeButton={false}
                render={
                  <Link href={`/checkout/pay/${orderId}`}>
                    Try paying again
                  </Link>
                }
              />
              <Button
                variant="outline"
                className="w-full"
                nativeButton={false}
                render={
                  <Link href={`/orders?new=${orderId}`}>View my order</Link>
                }
              />
            </>
          ) : (
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href="/orders">Go to my orders</Link>}
            />
          )}
        </div>
      </div>
    </main>
  );
}
