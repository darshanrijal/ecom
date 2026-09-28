import { api, HydrateClient } from "@/__rpc/server";
import { ErrorBoundary } from "@/components/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FavoritesClientPage } from "./page.client";

export default async function FavoritesPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  api.favorite.list.prefetch();

  return (
    <HydrateClient>
      <Suspense
        fallback={
          <main
            aria-busy="true"
            className="mx-auto w-full max-w-7xl px-4 pt-6 pb-16 sm:px-6 lg:px-8"
          >
            <span className="sr-only">Loading favorites...</span>

            <Skeleton className="h-8 w-40" />

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {["sk1", "sk2", "sk3", "sk4"].map((id) => (
                <Skeleton key={id} className="h-72 w-full rounded-2xl" />
              ))}
            </div>
          </main>
        }
      >
        <ErrorBoundary
          fallback={
            <main role="alert" className="mx-auto max-w-2xl p-10 text-center">
              <h1 className="font-semibold text-2xl">
                Unable to load your favorites
              </h1>
              <p className="mt-2 text-muted-foreground">
                Something went wrong while loading this page. Please try again
                later.
              </p>
            </main>
          }
        >
          <FavoritesClientPage />
        </ErrorBoundary>
      </Suspense>
    </HydrateClient>
  );
}
