import type { RouterOutputs } from "@/__rpc/client";
import { ArrowUpRightIcon, PackageOpenIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type Category = RouterOutputs["products"]["getHomeData"]["categories"][number];

interface CategorySpotlightProps {
  categories: Category[];
}

export function CategorySpotlight({ categories }: CategorySpotlightProps) {
  const [primary, secondary] = categories;
  if (!(primary && secondary)) {
    return null;
  }

  return (
    <section className="border-b py-12 sm:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-xl space-y-2">
          <h2 className="font-semibold text-2xl tracking-tight sm:text-3xl">
            Start with the essentials
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
            Two departments customers shop most. Jump straight in.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-5 lg:gap-5">
          <CategoryPanel category={primary} className="lg:col-span-3" large />
          <CategoryPanel category={secondary} className="lg:col-span-2" />
        </div>
      </div>
    </section>
  );
}

function CategoryPanel({
  category,
  className,
  large = false,
}: {
  category: Category;
  className?: string;
  large?: boolean;
}) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className={`group relative block overflow-hidden rounded-2xl border bg-muted transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.995] ${
        large
          ? "aspect-[16/10] lg:aspect-auto lg:min-h-[22rem]"
          : "aspect-[4/5]"
      } ${className ?? ""}`}
    >
      {category.sampleImage ? (
        <Image
          src={category.sampleImage}
          alt={category.name}
          fill
          sizes={
            large
              ? "(max-width: 1024px) 100vw, 60vw"
              : "(max-width: 1024px) 100vw, 40vw"
          }
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <PackageOpenIcon className="size-8" />
        </div>
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-6">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-xl tracking-tight sm:text-2xl">
            {category.name}
          </p>
          <p className="line-clamp-2 text-sm text-white/75">
            {category.description ||
              `${category.productCount} products available`}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-colors group-hover:bg-white/25">
          <ArrowUpRightIcon className="size-4" />
        </span>
      </div>
    </Link>
  );
}
