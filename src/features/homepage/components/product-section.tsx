import type { RouterOutputs } from "@/__rpc/client";
import { ProductCard } from "@/features/products/components/product-card";
import { SectionHeading } from "./section-heading";

type Product = RouterOutputs["products"]["getAllProducts"]["products"][number];

interface ProductSectionProps {
  id?: string;
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  products: Product[];
}

export function ProductSection({
  id,
  eyebrow,
  title,
  href,
  linkLabel,
  products,
}: ProductSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading
        id={id}
        eyebrow={eyebrow}
        title={title}
        href={href}
        linkLabel={linkLabel}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
