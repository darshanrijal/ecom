"use client";

import { trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  LockIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface WalletBrand {
  name: string;
  letter: string;
  header: string;
}

const ESEWA: WalletBrand = {
  name: "eSewa",
  letter: "e",
  header: "from-[#60BB46] to-[#3d8f35]",
};

const KHALTI: WalletBrand = {
  name: "Khalti",
  letter: "K",
  header: "from-[#5C2D91] to-[#7d2fb5]",
};

interface EsewaRedirect {
  paymentUrl: string;
  fields: Record<string, string>;
}

interface GatewayBody {
  status?: string;
  message?: string;
}

type Phase = "init" | "redirecting" | "verifying" | "failed";

export function PayClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order] = trpc.orders.getById.useSuspenseQuery({ orderId });
  const utils = trpc.useUtils();

  const brand = order.paymentMethod === "ESEWA" ? ESEWA : KHALTI;
  const gatewayData = searchParams.get("data");
  const gatewayTransaction =
    searchParams.get("pidx") ?? searchParams.get("txnid");
  const isGatewayReturn =
    order.paymentMethod === "ESEWA" ? !!gatewayData : !!gatewayTransaction;
  const returnStatus = searchParams.get("status");
  const declined =
    !isGatewayReturn && !!returnStatus && returnStatus !== "COMPLETE";
  const needsPayment =
    order.status === "PENDING" && order.paymentMethod !== "COD";

  const [phase, setPhase] = useState<Phase>(() =>
    isGatewayReturn ? "verifying" : "init"
  );
  const [error, setError] = useState("");
  const [verifyAttempt, setVerifyAttempt] = useState(0);
  const [esewaRedirect, setEsewaRedirect] = useState<EsewaRedirect | null>(
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const lastVerifyAttempt = useRef(-1);

  useEffect(() => {
    if (!needsPayment && !isGatewayReturn) {
      router.replace(`/orders?new=${order.id}`);
    }
  }, [needsPayment, isGatewayReturn, order.id, router]);

  useEffect(() => {
    if (!isGatewayReturn || lastVerifyAttempt.current === verifyAttempt) {
      return;
    }
    lastVerifyAttempt.current = verifyAttempt;
    setPhase("verifying");
    setError("");

    let cancelled = false;

    (async () => {
      try {
        const query = new URLSearchParams(searchParams.toString());
        query.set("orderId", order.id);
        const response = await fetch(
          `/api/checkout-session?${query.toString()}`
        );
        const body = (await response.json()) as GatewayBody;
        if (cancelled) {
          return;
        }
        if (body.status === "success") {
          await utils.orders.list.invalidate();
          router.replace(`/orders?new=${order.id}`);
          return;
        }
        if (body.status === "pending") {
          setError(
            "The gateway hasn't confirmed this payment yet. Give it a moment, then check again."
          );
        } else {
          setError(
            typeof body.message === "string"
              ? body.message
              : "Payment verification failed."
          );
        }
        setPhase("failed");
      } catch {
        if (cancelled) {
          return;
        }
        setError(
          "Could not verify the payment. Check your connection and try again."
        );
        setPhase("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isGatewayReturn, verifyAttempt, searchParams, order.id, utils, router]);

  useEffect(() => {
    if (esewaRedirect) {
      formRef.current?.submit();
    }
  }, [esewaRedirect]);

  async function handleInitiate() {
    setError("");
    setPhase("redirecting");
    try {
      const response = await fetch("/api/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const body = (await response.json()) as GatewayBody & {
        paymentUrl?: string;
        esewaConfig?: Record<string, string>;
        khaltiPaymentUrl?: string;
      };
      if (!response.ok) {
        throw new Error(
          typeof body.message === "string"
            ? body.message
            : "Could not start the payment."
        );
      }
      if (typeof body.khaltiPaymentUrl === "string") {
        window.location.href = body.khaltiPaymentUrl;
        return;
      }
      if (typeof body.paymentUrl === "string" && body.esewaConfig) {
        setEsewaRedirect({
          paymentUrl: body.paymentUrl,
          fields: body.esewaConfig,
        });
        return;
      }
      throw new Error("The payment gateway returned an unexpected response.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not start the payment."
      );
      setPhase("init");
    }
  }

  if (!needsPayment && !isGatewayReturn) {
    return null;
  }

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
        {!!declined && phase === "init" && (
          <div className="mb-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-amber-800 text-xs dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            The {brand.name} payment wasn&apos;t completed. You can try again.
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border bg-card shadow-lg">
          <div className={`bg-linear-to-r ${brand.header} p-6 text-white`}>
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-white/20 font-bold text-lg">
                {brand.letter}
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

          {phase === "init" && (
            <div className="p-6">
              <p className="text-muted-foreground text-sm">
                You&apos;ll continue to {brand.name} to authorize this payment.
                Nothing is charged until you confirm on the next screen.
              </p>
              {!!error && (
                <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 font-medium text-destructive text-xs">
                  {error}
                </p>
              )}
              <Button
                type="button"
                onClick={handleInitiate}
                className="mt-4 h-11 w-full"
              >
                <ShieldCheckIcon className="size-4" />
                Pay Rs. {order.totalAmount.toLocaleString()}
              </Button>
            </div>
          )}

          {(phase === "redirecting" || phase === "verifying") && (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <Spinner />
              <p className="text-muted-foreground text-sm">
                {phase === "redirecting"
                  ? `Redirecting to ${brand.name}...`
                  : "Verifying your payment..."}
              </p>
            </div>
          )}

          {phase === "failed" && (
            <div className="p-6">
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="font-medium text-destructive text-xs">{error}</p>
              </div>
              <Button
                type="button"
                onClick={() => setVerifyAttempt((attempt) => attempt + 1)}
                className="mt-4 h-11 w-full"
              >
                <RefreshCwIcon className="size-4" />
                Check again
              </Button>
              <Button
                type="button"
                variant="outline"
                className="mt-2 h-11 w-full"
                onClick={() => {
                  lastVerifyAttempt.current = -1;
                  setError("");
                  setPhase("init");
                  router.replace(`/checkout/pay/${order.id}`);
                }}
              >
                Start a new payment
              </Button>
              <Link
                href={`/orders?new=${order.id}`}
                className="mt-3 block text-center text-muted-foreground text-xs transition-colors hover:text-foreground"
              >
                View my orders
              </Link>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-muted-foreground text-xs">
          Powered by {brand.name} · You are only charged after you confirm.
        </p>
      </main>

      {!!esewaRedirect && (
        <form
          ref={formRef}
          method="POST"
          action={esewaRedirect.paymentUrl}
          className="hidden"
        >
          {Object.entries(esewaRedirect.fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
        </form>
      )}
    </div>
  );
}
