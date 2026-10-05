import { api } from "@/__rpc/server";
import { CategoryGrid } from "@/features/homepage/components/category-grid";
import { CategorySpotlight } from "@/features/homepage/components/category-spotlight";
import { ClosingCta } from "@/features/homepage/components/closing-cta";
import { DealSpotlight } from "@/features/homepage/components/deal-spotlight";
import { Hero } from "@/features/homepage/components/hero";
import { ProductShelf } from "@/features/homepage/components/product-shelf";
import { TrustBand } from "@/features/homepage/components/trust-band";
import { UspStrip } from "@/features/homepage/components/usp-strip";
import { PromoBanners } from "../../features/homepage/components/promo-banners";

export default async function Home() {
  const { categories, deals, popular, stats } =
    await api.products.getHomeData();

  const [spotlightDeal, ...moreDeals] = deals;
  const featured = spotlightDeal ?? popular[0] ?? null;

  // Prefer high-traffic departments for the spotlight panels.
  const preferredSlugs = ["mobile-phones", "televisions", "laptops"];
  const rankedCategories = [...categories].sort((a, b) => {
    const aRank = preferredSlugs.indexOf(a.slug);
    const bRank = preferredSlugs.indexOf(b.slug);
    const aScore = aRank === -1 ? 99 : aRank;
    const bScore = bRank === -1 ? 99 : bRank;
    if (aScore !== bScore) {
      return aScore - bScore;
    }
    return b.productCount - a.productCount;
  });
  const spotlightCategories = rankedCategories
    .filter((category) => category.productCount > 0)
    .slice(0, 2);

  const popularWithoutFeatured = popular.filter(
    (product) => product.id !== featured?.id
  );

  return (
    <main>
      <Hero
        productCount={stats.productCount}
        categoryCount={stats.categoryCount}
      />

      <UspStrip />

      <CategoryGrid categories={categories} />

      {!!spotlightDeal && <DealSpotlight deal={spotlightDeal} />}

      {moreDeals.length > 0 ? (
        <ProductShelf
          title="More deals"
          description="Prices already reduced. Stock moves fast on the best cuts."
          href="/products"
          linkLabel="See all deals"
          products={moreDeals}
        />
      ) : null}

      <PromoBanners />

      <CategorySpotlight categories={spotlightCategories} />

      <ProductShelf
        title="Popular right now"
        description="A pick from each category so you can scan the store quickly."
        href="/products"
        products={popularWithoutFeatured}
      />

      <TrustBand />

      <ClosingCta productCount={stats.productCount} />
    </main>
  );
}
