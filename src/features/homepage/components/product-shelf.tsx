import type { RouterOutputs } from "@/__rpc/client";
import { ProductCard } from "@/features/products/components/product-card";
import Link from "next/link";

type Product = RouterOutputs["products"]["getAllProducts"]["products"][number];

interface ProductShelfProps {
  id?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  products: Product[];
}

export function ProductShelf({
  id,
  title,
  description,
  href,
  linkLabel = "View all",
  products,
}: ProductShelfProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section id={id} className="scroll-mt-28 border-b py-12 sm:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl space-y-2">
            <h2 className="font-semibold text-2xl tracking-tight sm:text-3xl">
              {title}
            </h2>
            {!!description && (
              <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                {description}
              </p>
            )}
          </div>
          {!!href && (
            <Link
              href={href}
              className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              {linkLabel}
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
