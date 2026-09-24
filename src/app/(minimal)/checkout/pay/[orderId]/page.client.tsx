"use client";

import { trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EsewaSubmitForm } from "@/features/checkout/components/esewa-submit-form";
import { ArrowLeftIcon, LockIcon, ShieldCheckIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ESEWA_LOGO = "/eSewa_Official_Logo_Pack/E White.png";

interface WalletBrand {
  name: string;
  letter?: string;
  logo?: { src: string; alt: string };
  header: string;
}

const ESEWA: WalletBrand = {
  name: "eSewa",
  logo: { src: ESEWA_LOGO, alt: "eSewa" },
  header: "from-[#60BB46] to-[#3d8f35]",
};

const KHALTI: WalletBrand = {
  name: "Khalti",
  letter: "K",
  header: "from-[#5C2D91] to-[#7d2fb5]",
};

interface PayOrder {
  id: string;
  status: string;
  paymentMethod: string;
  totalAmount: number;
}

export function PayClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order] = trpc.orders.getById.useSuspenseQuery({ orderId });

  const needsPayment = order.status !== "PAID" && order.paymentMethod !== "COD";

  useEffect(() => {
    if (!needsPayment) {
      router.replace(`/orders?new=${order.id}`);
    }
  }, [needsPayment, order.id, router]);

  if (!needsPayment) {
    return null;
  }

  const brand = order.paymentMethod === "ESEWA" ? ESEWA : KHALTI;

  const isEsewa = order.paymentMethod === "ESEWA";
  const isKhalti = order.paymentMethod === "KHALTI";

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-muted/60 to-background">
      <header className="border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-lg items-center justify-between px-4">
          <Link
            href={`/orders?new=${order.id}`}
            className="flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Cancel
          </Link>

          <span className="flex items-center gap-1.5 font-medium text-sm">
            <LockIcon className="size-3.5 text-emerald-600" />
            Secure checkout
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        {!!(isEsewa || isKhalti) && (
          <div className="mb-4 rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-emerald-800 text-xs dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            You&apos;ll be redirected to {brand.name} to authorize this payment.
            Nothing is charged until you confirm.
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border bg-card shadow-lg">
          <div className={`bg-linear-to-r ${brand.header} p-6 text-white`}>
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center overflow-hidden rounded-xl bg-white/20 font-bold text-lg">
                {brand.logo ? (
                  <Image
                    src={brand.logo.src}
                    alt={brand.logo.alt}
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                ) : (
                  brand.letter
                )}
              </span>
              <span className="rounded-full bg-white/20 px-2.5 py-1 font-medium text-xs">
                Order #{order.id.slice(-8).toUpperCase()}
              </span>
            </div>

            <p className="mt-5 text-white/80 text-xs">Amount due</p>
            <p className="font-bold text-3xl tabular-nums">
              Rs. {order.totalAmount.toLocaleString()}
            </p>
            <p className="mt-1 text-white/75 text-xs">
              {brand.name} · Gada Electronics
            </p>
          </div>

          {isEsewa ? <EsewaPay order={order} /> : <KhaltiPay order={order} />}
        </div>

        <p className="mt-4 text-center text-muted-foreground text-xs">
          {isEsewa
            ? "Powered by eSewa ePay · Secured with HMAC-SHA256"
            : "Powered by Khalti ePay"}
        </p>
      </main>
    </div>
  );
}

function EsewaPay({ order }: { order: PayOrder }) {
  const initiate = trpc.orders.initiateEsewaPayment.useMutation();
  const [form, setForm] = useState<{
    url: string;
    fields: Record<string, string>;
  } | null>(null);
  const [error, setError] = useState("");

  async function handlePay() {
    setError("");
    try {
      const init = await initiate.mutateAsync({ orderId: order.id });
      setForm(init);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't start the eSewa payment. Please try again."
      );
    }
  }

  return (
    <div className="p-6">
      <p className="text-muted-foreground text-sm">
        Click below to continue to eSewa&apos;s secure checkout. You&apos;ll be
        asked to log in with your eSewa ID and confirm the payment.
      </p>

      {!!error && (
        <p className="mt-3 font-medium text-destructive text-xs">{error}</p>
      )}

      <Button
        type="button"
        onClick={handlePay}
        className="mt-4 h-11 w-full"
        disabled={initiate.isPending || !!form}
      >
        {initiate.isPending ? (
          <Spinner />
        ) : (
          <ShieldCheckIcon className="size-4" />
        )}
        {initiate.isPending
          ? "Contacting eSewa…"
          : `Pay Rs. ${order.totalAmount.toLocaleString()} with eSewa`}
      </Button>

      {!!form && (
        <>
          <p className="mt-4 flex items-center justify-center gap-2 text-muted-foreground text-xs">
            <Spinner className="size-3.5" />
            Redirecting you to eSewa…
          </p>
          <EsewaSubmitForm url={form.url} fields={form.fields} />
        </>
      )}
    </div>
  );
}

function KhaltiPay({ order }: { order: PayOrder }) {
  const router = useRouter();
  const initiate = trpc.orders.initiateKhaltiPayment.useMutation();
  const [error, setError] = useState("");

  async function handlePay() {
    setError("");
    try {
      const init = await initiate.mutateAsync({ orderId: order.id });
      router.push(init.paymentUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't start the Khalti payment. Please try again."
      );
    }
  }

  return (
    <div className="p-6">
      <p className="text-muted-foreground text-sm">
        Click below to continue to Khalti&apos;s secure checkout. You&apos;ll be
        asked to log in with your Khalti ID and confirm the payment.
      </p>

      {!!error && (
        <p className="mt-3 font-medium text-destructive text-xs">{error}</p>
      )}

      <Button
        type="button"
        onClick={handlePay}
        className="mt-4 h-11 w-full"
        disabled={initiate.isPending}
      >
        {initiate.isPending ? (
          <Spinner />
        ) : (
          <ShieldCheckIcon className="size-4" />
        )}
        {initiate.isPending
          ? "Contacting Khalti…"
          : `Pay Rs. ${order.totalAmount.toLocaleString()} with Khalti`}
      </Button>
    </div>
  );
}
