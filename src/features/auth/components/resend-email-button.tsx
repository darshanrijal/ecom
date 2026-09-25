"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/components/ui/toast";

interface ResendEmailButtonProps {
  email: string;
}

export function ResendEmailButton({ email }: ResendEmailButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldown((c) => c - 1);
    }, 1000);

    return clearInterval(timer);
  }, [cooldown]);

  async function handleResendEmail() {
    if (cooldown > 0) {
      return;
    }

    setIsLoading(true);
    setStatus("idle");
    setErrorMessage("");
    setCooldown(60);

    await authClient.sendVerificationEmail(
      { email },
      {
        onSuccess: () => {
          setStatus("success");
        },
        onError: ({ error }) => {
          setStatus("error");
          setErrorMessage(error.message || "Failed to resend email");
          if (error.status === 429) {
            toast.add({
              type: "warning",
              description:
                "Please wait some time before sending another request",
            });
          }
        },
        onResponse: () => {
          setIsLoading(false);
        },
      }
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={isLoading || cooldown > 0}
        onClick={handleResendEmail}
        className="w-full gap-2 bg-orange-500 font-medium text-white hover:bg-orange-600 focus:ring-2 focus:ring-orange-500/20 active:bg-orange-700 disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        {isLoading ? "Sending..." : "Resend verification email"}
      </Button>

      {status === "success" && (
        <div className="flex items-center justify-center gap-1.5 text-emerald-600 text-xs dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Verification email sent successfully!</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center justify-center gap-1.5 text-rose-600 text-xs dark:text-rose-400">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
