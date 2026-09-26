import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { UserButton } from "@/features/auth/components/userbutton";
import { isAdminEmail } from "@/lib/admin";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }
  if (!isAdminEmail(session.user.email)) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              href="/admin"
              className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
            >
              <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheckIcon className="size-4" />
              </span>
              <span className="hidden sm:inline">Admin panel</span>
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              nativeButton={false}
              render={<Link href="/">View store</Link>}
            />
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
