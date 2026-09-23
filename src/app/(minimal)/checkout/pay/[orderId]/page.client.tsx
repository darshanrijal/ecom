"use client";

import { trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        {order.paymentMethod === "KHALTI" && (
          <div className="mb-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-amber-800 text-xs dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Demo gateway — no real money moves. Use any wallet number and any
            4-digit code.
          </div>
        )}

        {order.paymentMethod === "ESEWA" && (
          <div className="mb-4 rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-emerald-800 text-xs dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            You&apos;ll be redirected to eSewa to authorize this payment.
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

          {order.paymentMethod === "ESEWA" ? (
            <EsewaPay order={order} />
          ) : (
            <KhaltiPay order={order} />
          )}
        </div>

        <p className="mt-4 text-center text-muted-foreground text-xs">
          {order.paymentMethod === "ESEWA"
            ? "Powered by eSewa ePay · Secured with HMAC-SHA256"
            : "Powered by Khalti (demo) · You will not be charged"}
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
  const completePayment = trpc.orders.completePayment.useMutation();

  const [step, setStep] = useState<"wallet" | "otp">("wallet");
  const [walletNumber, setWalletNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

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
      await completePayment.mutateAsync({ orderId: order.id, walletNumber });
      router.push(`/orders?new=${order.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Payment failed. Please try again."
      );
    }
  }

  if (step === "wallet") {
    return (
      <form onSubmit={handleWalletContinue} className="p-6">
        <label htmlFor="wallet-number" className="font-medium text-sm">
          Khalti wallet number
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
          Enter the mobile number linked to your Khalti account.
        </p>
        {!!error && (
          <p className="mt-2 font-medium text-destructive text-xs">{error}</p>
        )}
        <Button type="submit" className="mt-4 h-11 w-full">
          Continue
        </Button>
      </form>
    );
  }

  return (
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
        onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
        className="mt-3 h-12 text-center font-bold text-xl tracking-[0.5em]"
      />
      <p className="mt-2 text-muted-foreground text-xs">
        Demo: enter any 4 digits to simulate the OTP.
      </p>
      {!!error && (
        <p className="mt-2 font-medium text-destructive text-xs">{error}</p>
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
  );
}
