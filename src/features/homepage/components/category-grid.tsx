import type { RouterOutputs } from "@/__rpc/client";
import { PackageOpenIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "./section-heading";

type Category = RouterOutputs["products"]["getHomeData"]["categories"][number];

interface CategoryGridProps {
  categories: Category[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading
        id="categories"
        eyebrow="Browse"
        title="Shop by category"
        href="/products"
        linkLabel="All products"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="group relative block aspect-[4/3] overflow-hidden rounded-2xl border bg-muted"
          >
            {category.sampleImage ? (
              <Image
                src={category.sampleImage}
                alt={category.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <PackageOpenIcon className="size-8" />
              </div>
            )}

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent"
            />

            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="truncate font-medium text-sm text-white">
                {category.name}
              </p>
              <p className="text-white/75 text-xs">
                {category.productCount}{" "}
                {category.productCount === 1 ? "product" : "products"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
