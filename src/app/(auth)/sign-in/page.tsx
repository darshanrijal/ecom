import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import Image from "next/image";
import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const { user } = await getCurrentSession();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      {/* Wrapper container enforcing equal height across desktop screens */}
      <div className="flex w-full max-w-4xl overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
        {/* Left: Sign-In Card Content */}
        <Card className="flex w-full flex-col justify-between rounded-r-none border-0 p-4 shadow-none md:w-1/2">
          <div>
            <CardHeader className="gap-1">
              <CardTitle className="flex flex-col items-center gap-2 text-center font-bold text-2xl">
                <Image
                  src="/logo.png"
                  height={80}
                  width={80}
                  alt="Gada Electronics"
                />
                <span>Sign in to Gada Electronics</span>
              </CardTitle>
              <CardDescription className="text-center">
                Manage your cart, orders and apply discounts
              </CardDescription>
            </CardHeader>
            <CardContent className="my-8">
              <SignInForm />
            </CardContent>
          </div>
          <CardFooter className="justify-center">
            <Button
              nativeButton={false}
              variant="link"
              render={<Link href="/sign-up">Don't have an account?</Link>}
            />
          </CardFooter>
        </Card>

        {/* Right: Desktop Auth Image */}
        <div className="relative hidden md:block md:w-1/2">
          <Image
            src="/auth_image.png"
            alt="Authentication visual"
            fill
            priority
            className="object-cover"
          />
        </div>
      </div>
    </main>
  );
}
