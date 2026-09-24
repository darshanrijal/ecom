"use client";

import { trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeftIcon, LockIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

const NON_DIGITS = /\D/g;
const COUNTRY_CODE = /^977/;
const OTP_CODE = /^\d{4}$/;

function maskWallet(value: string) {
  const digits = value.replace(NON_DIGITS, "").replace(COUNTRY_CODE, "");
  if (digits.length < 4) {
    return digits;
  }
  return `${digits.slice(0, 2)}*****${digits.slice(-2)}`;
}

export function PayClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order] = trpc.orders.getById.useSuspenseQuery({ orderId });
  const completePayment = trpc.orders.completePayment.useMutation();
  const utils = trpc.useUtils();

  const [step, setStep] = useState<"wallet" | "otp">("wallet");
  const [walletNumber, setWalletNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

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

  function handleWalletContinue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const digits = walletNumber
      .replace(NON_DIGITS, "")
      .replace(COUNTRY_CODE, "");

    if (digits.length !== 10) {
      setError("Enter a valid 10-digit wallet number");
      return;
    }

    setError("");
    setStep("otp");
  }

  async function handlePay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!OTP_CODE.test(otp)) {
      setError("Enter the 4-digit verification code");
      return;
    }

    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await completePayment.mutateAsync({ orderId, walletNumber });
      utils.orders.list.invalidate();
      router.push(`/orders?new=${order.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Payment failed. Please try again."
      );
    }
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
        <div className="mb-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-amber-800 text-xs dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Demo gateway — no real money moves. Use any wallet number and any
          4-digit code.
        </div>

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

          {step === "wallet" ? (
            <form onSubmit={handleWalletContinue} className="p-6">
              <label htmlFor="wallet-number" className="font-medium text-sm">
                {brand.name} wallet number
              </label>
              <Input
                id="wallet-number"
                inputMode="tel"
                autoComplete="tel"
                placeholder="98XXXXXXXX"
                value={walletNumber}
                onChange={(event) => setWalletNumber(event.target.value)}
                className="mt-2 h-11"
              />
              <p className="mt-2 text-muted-foreground text-xs">
                Enter the mobile number linked to your {brand.name} account.
              </p>
              {!!error && (
                <p className="mt-2 font-medium text-destructive text-xs">
                  {error}
                </p>
              )}
              <Button type="submit" className="mt-4 h-11 w-full">
                Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePay} className="p-6">
              <p className="text-sm">
                Enter the 4-digit code sent to{" "}
                <span className="font-medium">{maskWallet(walletNumber)}</span>
              </p>
              <Input
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                aria-label="4-digit verification code"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, ""))
                }
                className="mt-3 h-12 text-center font-bold text-xl tracking-[0.5em]"
              />
              <p className="mt-2 text-muted-foreground text-xs">
                Demo: enter any 4 digits to simulate the OTP.
              </p>
              {!!error && (
                <p className="mt-2 font-medium text-destructive text-xs">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="mt-4 h-11 w-full"
                disabled={completePayment.isPending}
              >
                {completePayment.isPending ? (
                  <Spinner />
                ) : (
                  <ShieldCheckIcon className="size-4" />
                )}
                Pay Rs. {order.totalAmount.toLocaleString()}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("wallet");
                  setError("");
                }}
                className="mt-3 w-full text-center text-muted-foreground text-xs transition-colors hover:text-foreground"
              >
                Use a different wallet number
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-muted-foreground text-xs">
          Powered by {brand.name} (demo) · You will not be charged
        </p>
      </main>
    </div>
  );
}
