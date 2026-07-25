import { getCurrentSession } from "@/lib/auth";
import { MailsIcon } from "lucide-react";
import { redirect } from "next/navigation";

export default async function EmailVerificatoinPage() {
  const { user } = await getCurrentSession();
  if (!user) {
    redirect("/sign-in");
  }
  if (user.emailVerified) {
    redirect("/");
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="rounded-2xl bg-orange-400/60 p-6">
        <MailsIcon className="size-8" />
      </div>
      <div className="flex flex-col items-center justify-center gap-1">
        <h1 className="font-bold text-3xl">Check your Email</h1>
        <p>We've sent you email verification link at</p>
        <a
          href="https://mail.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline decoration-orange-400/60 underline-offset-2"
        >
          {user.email}
        </a>
      </div>
    </main>
  );
}
