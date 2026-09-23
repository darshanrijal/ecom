import { api, HydrateClient } from "@/__rpc/server";
import { SectionHeading } from "@/features/homepage/components/section-heading";
import { ProductList } from "@/features/products/components/product-list";

export default async function ProductsPage() {
  await api.products.getAllProducts.prefetchInfinite({ limit: 20 });

  return (
    <HydrateClient>
      <main className="mx-auto w-full max-w-7xl px-4 pt-8 pb-6 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Complete range" title="All products" />
        <ProductList />
      </main>
    </HydrateClient>
  );
}
