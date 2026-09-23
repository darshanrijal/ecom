// biome-ignore-all lint: just a seed file

/**
 * Prisma seed script — Gada Electronics
 * -----------------------------------------------------------------------
 * Seeds:
 *   - Categories (10) + Products (61) from src/lib/catalog.ts
 *   - ProductOptions + ProductOptionValues (Color, Storage, RAM, ...)
 *   - ProductSKUs, one per combination of option values
 *
 * Product images are REAL photos downloaded by
 * scripts/fetch-product-images.ts into public/products/ (manifest:
 * src/lib/product-images.json) — never placeholder services.
 *
 * HOW TO RUN
 * -----------------------------------------------------------------------
 *   bun seed.ts
 *
 * Re-fetch images first if the catalog changed:
 *   bun scripts/fetch-product-images.ts
 * -----------------------------------------------------------------------
 */

import { db } from "@/lib/prisma";
import {
  CATEGORIES,
  type OptionDef,
  type ProductDef,
  slugify,
} from "./src/lib/catalog";
import PRODUCT_IMAGES from "./src/lib/product-images.json";

const prisma = db;

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/** Cartesian product of all option values, e.g.
 *  [{name:"Color",values:["Black","Blue"]},{name:"Storage",values:["128GB","256GB"]}]
 *  -> [{Color:"Black",Storage:"128GB"}, {Color:"Black",Storage:"256GB"}, ...]
 */
function cartesian(options: OptionDef[]): Record<string, string>[] {
  return options.reduce<Record<string, string>[]>(
    (acc, opt) => {
      const next: Record<string, string>[] = [];
      for (const combo of acc) {
        for (const val of opt.values) {
          next.push({ ...combo, [opt.name]: val });
        }
      }
      return next;
    },
    [{}]
  );
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Local path under /public downloaded by scripts/fetch-product-images.ts. */
const IMAGE_MANIFEST = PRODUCT_IMAGES as Record<
  string,
  { path: string; title: string }
>;

function productImage(productSlug: string): string {
  const entry = IMAGE_MANIFEST[productSlug];
  if (!entry) {
    throw new Error(
      `No image for "${productSlug}" — run: bun scripts/fetch-product-images.ts`
    );
  }
  return entry.path;
}

// -------------------------------------------------------------------------
// Seed logic
// -------------------------------------------------------------------------

async function seedCategory(categoryDef: (typeof CATEGORIES)[number]) {
  const categorySlug = slugify(categoryDef.name);

  const category = await prisma.category.create({
    data: {
      name: categoryDef.name,
      slug: categorySlug,
      description: categoryDef.description,
    },
  });

  console.log(`Created category: ${category.name}`);

  for (const productDef of categoryDef.products) {
    await seedProduct(category.id, categorySlug, productDef);
  }
}

async function seedProduct(
  categoryId: string,
  categorySlug: string,
  productDef: ProductDef
) {
  const productSlug = slugify(productDef.name);
  const image = productImage(productSlug);

  const product = await prisma.product.create({
    data: {
      name: productDef.name,
      slug: productSlug,
      description: productDef.description,
      categoryId,
      baseImage: image,
      isPublished: true,
    },
  });

  // Create options + values, keeping a lookup map: "OptionName:Value" -> valueId
  const valueIdMap = new Map<string, string>();

  for (const optionDef of productDef.options) {
    const option = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: optionDef.name,
      },
    });

    for (const value of optionDef.values) {
      const optionValue = await prisma.productOptionValue.create({
        data: {
          optionId: option.id,
          value,
        },
      });
      valueIdMap.set(`${optionDef.name}:${value}`, optionValue.id);
    }
  }

  // Generate one SKU per combination of option values
  const combos = cartesian(productDef.options);

  let skuIndex = 0;
  for (const combo of combos) {
    skuIndex += 1;

    const priceJitter = randomInt(-5, 10) / 100; // -5% to +10%
    const price = round2(productDef.basePrice * (1 + priceJitter));
    const discountMarkup = randomInt(5, 25) / 100; // 5% to 25% above sale price
    const originalPrice = round2(price * (1 + discountMarkup));

    const skuCode = `${productSlug.toUpperCase()}-${skuIndex}`;

    const optionValueIds = Object.entries(combo).map(([optName, val]) => {
      const id = valueIdMap.get(`${optName}:${val}`);
      if (!id) throw new Error(`Missing option value id for ${optName}:${val}`);
      return { id };
    });

    await prisma.productSKU.create({
      data: {
        productId: product.id,
        sku: skuCode,
        price,
        originalPrice,
        stock: randomInt(0, 150),
        imageUrl: image,
        optionValues: {
          connect: optionValueIds,
        },
      },
    });
  }

  console.log(`  Created product: ${product.name} (${combos.length} SKUs)`);
}

async function cleanup() {
  console.log(
    "Clearing existing catalog data (categories, products, options, SKUs)..."
  );
  await prisma.category.deleteMany();
}

async function main() {
  const totalProducts = CATEGORIES.reduce(
    (sum, c) => sum + c.products.length,
    0
  );

  await cleanup();

  console.log(
    `Seeding ${CATEGORIES.length} categories and ${totalProducts} products...`
  );

  for (const categoryDef of CATEGORIES) {
    await seedCategory(categoryDef);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
