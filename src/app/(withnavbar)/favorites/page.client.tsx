"use client";

import type { ReactNode } from "react";

import { trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/features/products/components/product-card";
import { ProductCardSkeleton } from "@/features/products/components/product-card-skeleton";
import { CircleAlertIcon, HeartIcon } from "lucide-react";
import Link from "next/link";

function PageShell({
  subtitle,
  children,
}: {
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-16 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
            Favorites
          </h1>
          {subtitle ? (
            <p className="mt-1 text-muted-foreground text-sm">{subtitle}</p>
          ) : null}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          nativeButton={false}
          render={<Link href="/products">Continue shopping</Link>}
        />
      </div>

      {children}
    </main>
  );
}

function PromptCard({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-2xl border bg-card px-6 py-16 text-center shadow-xs">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <h2 className="mt-5 font-semibold text-lg">{title}</h2>
      <p className="mt-2 max-w-sm text-muted-foreground text-sm">
        {description}
      </p>
      <div className="mt-6">{action}</div>
    </div>
  );
}

export function FavoritesClientPage() {
  const [data, { isPending, isError, refetch }] =
    trpc.favorite.list.useSuspenseQuery();

  if (isPending) {
    return (
      <PageShell subtitle="Loading your favorites...">
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {["sk1", "sk2", "sk3", "sk4"].map((id) => (
            <ProductCardSkeleton key={id} />
          ))}
        </div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell>
        <PromptCard
          icon={<CircleAlertIcon className="size-7 text-muted-foreground" />}
          title="Couldn't load your favorites"
          description="Something went wrong while loading this page. Please try again."
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      </PageShell>
    );
  }

  const favorites = data;

  if (favorites.length === 0) {
    return (
      <PageShell subtitle="0 items">
        <PromptCard
          icon={<HeartIcon className="size-7 text-muted-foreground" />}
          title="No favorites yet"
          description="Tap the heart on any product to save it here for later."
          action={
            <Button
              nativeButton={false}
              render={<Link href="/products">Start shopping</Link>}
            />
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      subtitle={`${favorites.length} ${favorites.length === 1 ? "item" : "items"}`}
    >
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {favorites.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </PageShell>
  );
}
