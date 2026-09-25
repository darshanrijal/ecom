import { getCurrentSession } from "@/lib/auth";
import { Mail, ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ResendEmailButton } from "@/features/auth/components/resend-email-button";

export default async function EmailVerificationPage() {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.emailVerified) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* icon & heading */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-600">
            <Mail className="size-7 text-white" />
          </div>
          <h1 className="font-semibold text-2xl text-zinc-900 tracking-tight dark:text-zinc-50">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            We sent a verification link to
          </p>
          <span className="mt-1 inline-block rounded-md bg-zinc-100 px-2.5 py-1 font-medium text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            {user.email}
          </span>
        </div>

        {/* Informational Message */}
        <div className="rounded-lg bg-zinc-50 p-4 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
          <p className="text-center">
            Click on the link inside the email to verify your account. If you
            don't see it, check your spam folder.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <ResendEmailButton email={user.email} />

          <Link
            href="/sign-in"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 font-medium text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
