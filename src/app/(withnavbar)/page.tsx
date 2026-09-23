import { api } from "@/__rpc/server";
import { CategoryGrid } from "@/features/homepage/components/category-grid";
import { Hero } from "@/features/homepage/components/hero";
import { ProductSection } from "@/features/homepage/components/product-section";
import { PromoBanners } from "@/features/homepage/components/promo-banners";
import { UspStrip } from "@/features/homepage/components/usp-strip";

export default async function Home() {
  const { categories, deals, popular, stats } =
    await api.products.getHomeData();

  return (
    <main className="flex flex-col gap-10 pb-6 sm:gap-14">
      <Hero
        productCount={stats.productCount}
        categoryCount={stats.categoryCount}
      />

      <UspStrip />

      <CategoryGrid categories={categories} />

      <ProductSection
        id="deals"
        eyebrow="Limited time"
        title="Top deals"
        href="/products"
        products={deals}
      />

      <PromoBanners />

      <ProductSection
        eyebrow="Handpicked"
        title="Popular picks"
        href="/products"
        products={popular}
      />
    </main>
  );
}
