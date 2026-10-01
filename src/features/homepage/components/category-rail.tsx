import type { RouterOutputs } from "@/__rpc/client";
import { PackageOpenIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type Category = RouterOutputs["products"]["getHomeData"]["categories"][number];

interface CategoryRailProps {
  categories: Category[];
}

export function CategoryRail({ categories }: CategoryRailProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section id="categories" className="scroll-mt-28 border-b py-12 sm:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl space-y-2">
            <h2 className="font-semibold text-2xl tracking-tight sm:text-3xl">
              Shop by category
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
              From phones to kitchen appliances, find what you need without the
              noise.
            </p>
          </div>
          <Link
            href="/products"
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            View all products
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl">
        <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => (
            <li
              key={category.id}
              className="w-[70%] shrink-0 snap-start sm:w-[42%] md:w-[30%] lg:w-[22%]"
            >
              <Link
                href={`/category/${category.slug}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-2xl border bg-muted transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
              >
                {category.sampleImage ? (
                  <Image
                    src={category.sampleImage}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 70vw, (max-width: 1024px) 30vw, 22vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <PackageOpenIcon className="size-8" />
                  </div>
                )}

                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-linear-to-t from-black/75 via-black/25 to-transparent"
                />

                <div className="absolute inset-x-0 bottom-0 space-y-1 p-4 text-white">
                  <p className="font-medium text-base tracking-tight">
                    {category.name}
                  </p>
                  <p className="text-sm text-white/75 tabular-nums">
                    {category.productCount}{" "}
                    {category.productCount === 1 ? "product" : "products"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
