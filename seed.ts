// biome-ignore-all lint: just a seed file

/**
 * Prisma seed script — Electronics Store
 * -----------------------------------------------------------------------
 * Seeds:
 *   - Categories (10)
 *   - Products (61 total, spread across categories)
 *   - ProductOptions + ProductOptionValues (e.g. Color, Storage, RAM)
 *   - ProductSKUs, one per combination of option values
 *
 * HOW TO RUN
 * -----------------------------------------------------------------------
 * 1. Install deps (if not already present):
 *      npm install -D tsx
 *      npm install @prisma/client
 *
 * 2. Add to package.json:
 *      "prisma": {
 *        "seed": "tsx prisma/seed.ts"
 *      }
 *
 * 3. Put this file at prisma/seed.ts (adjust the import path to your
 *    generated client if needed), then run:
 *      npx prisma db seed
 *
 *    or directly:
 *      npx tsx prisma/seed.ts
 * -----------------------------------------------------------------------
 */

import { db } from "@/lib/prisma";

const prisma = db;

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

type OptionDef = {
  name: string;
  values: string[];
};

type ProductDef = {
  name: string;
  description: string;
  basePrice: number; // approximate market price, used to derive SKU pricing
  options: OptionDef[];
};

type CategoryDef = {
  name: string;
  description: string;
  products: ProductDef[];
};

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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

function placeholderImage(seed: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/600`;
}

// -------------------------------------------------------------------------
// Data
// -------------------------------------------------------------------------

const CATEGORIES: CategoryDef[] = [
  {
    name: "Mobile Phones",
    description: "Smartphones from leading brands with the latest features.",
    products: [
      {
        name: "iPhone 15",
        description:
          "Apple's flagship smartphone with A16 Bionic chip and dual-camera system.",
        basePrice: 79900,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
      {
        name: "iPhone 15 Pro",
        description:
          "Titanium-build Pro model with A17 Pro chip and pro-grade camera system.",
        basePrice: 134900,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
      {
        name: "Samsung Galaxy S24",
        description:
          "Flagship Android phone with AI-powered camera and vivid AMOLED display.",
        basePrice: 74999,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
      {
        name: "Samsung Galaxy A54",
        description:
          "Mid-range Galaxy with a 120Hz Super AMOLED display and 50MP camera.",
        basePrice: 34999,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
      {
        name: "OnePlus 12",
        description:
          "Performance-focused flagship with Snapdragon 8 Gen 3 and fast charging.",
        basePrice: 64999,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
      {
        name: "Xiaomi Redmi Note 13",
        description:
          "Budget-friendly phone with a large AMOLED display and solid battery life.",
        basePrice: 17999,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
      {
        name: "Google Pixel 8",
        description:
          "Google's clean-Android phone with computational photography and Tensor G3.",
        basePrice: 75999,
        options: [
          { name: "Color", values: ["Black", "Blue"] },
          { name: "Storage", values: ["128GB", "256GB"] },
        ],
      },
    ],
  },
  {
    name: "Televisions",
    description: "Smart TVs with 4K, QLED and OLED display technology.",
    products: [
      {
        name: "Samsung 55-inch 4K QLED Smart TV",
        description:
          "Vivid QLED panel with 4K resolution and built-in smart TV platform.",
        basePrice: 62999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "LG 65-inch OLED Smart TV",
        description:
          "Self-lit OLED pixels deliver perfect blacks and rich contrast.",
        basePrice: 154999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Sony 50-inch 4K Smart TV",
        description:
          "Sony's processor engine upscales content to crisp 4K detail.",
        basePrice: 54999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "TCL 43-inch Smart TV",
        description:
          "Affordable full-HD smart TV with built-in streaming apps.",
        basePrice: 21999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Mi 55-inch 4K TV",
        description:
          "Xiaomi's value-for-money 4K TV with PatchWall smart interface.",
        basePrice: 39999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Panasonic 32-inch HD TV",
        description:
          "Compact HD-ready TV, ideal for bedrooms and small spaces.",
        basePrice: 13999,
        options: [{ name: "Color", values: ["Black"] }],
      },
    ],
  },
  {
    name: "Refrigerators",
    description: "Single-door, double-door and side-by-side refrigerators.",
    products: [
      {
        name: "LG 260L Double Door Refrigerator",
        description:
          "Frost-free double door fridge with smart inverter compressor.",
        basePrice: 27999,
        options: [{ name: "Color", values: ["Silver", "Black"] }],
      },
      {
        name: "Samsung 340L Frost Free Refrigerator",
        description:
          "Spacious frost-free fridge with digital inverter technology.",
        basePrice: 34999,
        options: [{ name: "Color", values: ["Silver", "Black"] }],
      },
      {
        name: "Whirlpool 190L Single Door Refrigerator",
        description: "Compact single-door fridge, great for small households.",
        basePrice: 15999,
        options: [{ name: "Color", values: ["Silver", "Black"] }],
      },
      {
        name: "Haier 450L Side by Side Refrigerator",
        description:
          "Large-capacity side-by-side fridge with twin inverter cooling.",
        basePrice: 62999,
        options: [{ name: "Color", values: ["Silver", "Black"] }],
      },
      {
        name: "Godrej 236L Double Door Refrigerator",
        description:
          "Energy-efficient double door refrigerator with toughened glass shelves.",
        basePrice: 23999,
        options: [{ name: "Color", values: ["Silver", "Black"] }],
      },
      {
        name: "Bosch 300L French Door Refrigerator",
        description:
          "Premium French-door fridge with precise multi-zone cooling.",
        basePrice: 68999,
        options: [{ name: "Color", values: ["Silver", "Black"] }],
      },
    ],
  },
  {
    name: "Washing Machines",
    description: "Front load, top load and semi-automatic washing machines.",
    products: [
      {
        name: "LG 7kg Front Load Washing Machine",
        description: "Front-load washer with AI Direct Drive and steam wash.",
        basePrice: 32999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Samsung 8kg Front Load Washing Machine",
        description:
          "EcoBubble technology for deep cleaning at lower temperatures.",
        basePrice: 36999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "IFB 6.5kg Fully Automatic Washing Machine",
        description:
          "Fully automatic front-load washer with multiple wash programs.",
        basePrice: 26999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Whirlpool 7.5kg Top Load Washing Machine",
        description:
          "Top-load washer with 6th Sense technology for fabric care.",
        basePrice: 18999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Bosch 8kg Front Load Washing Machine",
        description:
          "German-engineered front loader with anti-vibration side panels.",
        basePrice: 39999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Haier 6kg Semi Automatic Washing Machine",
        description: "Budget semi-automatic twin-tub washing machine.",
        basePrice: 11999,
        options: [{ name: "Color", values: ["White"] }],
      },
    ],
  },
  {
    name: "Ovens & Microwaves",
    description: "Convection microwaves, grill microwaves and OTGs.",
    products: [
      {
        name: "LG 28L Convection Microwave Oven",
        description:
          "Convection microwave with auto cook menus and diet fry function.",
        basePrice: 13999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Samsung 23L Solo Microwave Oven",
        description:
          "Compact solo microwave, ideal for reheating and basic cooking.",
        basePrice: 7999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "IFB 20L Grill Microwave Oven",
        description: "Grill microwave with quartz heater for crispy grilling.",
        basePrice: 9499,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Bajaj Majesty Oven Toaster Griller",
        description: "Compact OTG for baking, toasting and grilling at home.",
        basePrice: 5499,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Morphy Richards 40L OTG",
        description:
          "Large-capacity OTG suitable for baking cakes and roasting.",
        basePrice: 8999,
        options: [{ name: "Color", values: ["Black"] }],
      },
      {
        name: "Panasonic 27L Convection Microwave",
        description:
          "Convection microwave with turbo defrost and pre-set menus.",
        basePrice: 12499,
        options: [{ name: "Color", values: ["Black"] }],
      },
    ],
  },
  {
    name: "Mixers & Grinders",
    description: "Mixer grinders and juicers for everyday kitchen use.",
    products: [
      {
        name: "Preethi Zodiac Mixer Grinder",
        description:
          "750W mixer grinder with 5 jars and turbo motor technology.",
        basePrice: 6499,
        options: [{ name: "Color", values: ["Red", "White"] }],
      },
      {
        name: "Bajaj Rex Mixer Grinder",
        description: "500W mixer grinder with 3 stainless steel jars.",
        basePrice: 2799,
        options: [{ name: "Color", values: ["Red", "White"] }],
      },
      {
        name: "Philips HL7756 Mixer Grinder",
        description: "750W mixer grinder with advanced Aer Shield technology.",
        basePrice: 4999,
        options: [{ name: "Color", values: ["Red", "White"] }],
      },
      {
        name: "Butterfly Matchless Mixer Grinder",
        description: "Powerful mixer grinder with vent design for cooling.",
        basePrice: 3499,
        options: [{ name: "Color", values: ["Red", "White"] }],
      },
      {
        name: "Sujata Dynamix Mixer Grinder",
        description: "Heavy-duty mixer grinder built for continuous daily use.",
        basePrice: 4299,
        options: [{ name: "Color", values: ["Red", "White"] }],
      },
      {
        name: "Maharaja Whiteline Mixer Grinder",
        description: "Compact mixer grinder with overload protection.",
        basePrice: 2499,
        options: [{ name: "Color", values: ["Red", "White"] }],
      },
    ],
  },
  {
    name: "Laptops",
    description: "Laptops for work, study and everyday computing.",
    products: [
      {
        name: "MacBook Air M2",
        description:
          "Ultra-thin laptop with Apple M2 chip and all-day battery life.",
        basePrice: 114900,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
      {
        name: "Dell XPS 13",
        description:
          "Premium ultrabook with InfinityEdge display and compact chassis.",
        basePrice: 94999,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
      {
        name: "HP Pavilion 15",
        description:
          "Everyday laptop with a bright display and reliable performance.",
        basePrice: 54999,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
      {
        name: "Lenovo ThinkPad E14",
        description:
          "Business laptop with a durable chassis and strong keyboard.",
        basePrice: 59999,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
      {
        name: "ASUS VivoBook 15",
        description: "Value-for-money laptop with a full-size number pad.",
        basePrice: 44999,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
      {
        name: "Acer Aspire 7",
        description:
          "Mid-range laptop with dedicated graphics for light gaming.",
        basePrice: 52999,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
      {
        name: "MSI Modern 14",
        description:
          "Slim and light laptop designed for productivity on the go.",
        basePrice: 49999,
        options: [
          { name: "Color", values: ["Silver"] },
          { name: "RAM", values: ["8GB", "16GB"] },
        ],
      },
    ],
  },
  {
    name: "Air Conditioners",
    description: "Split and window ACs with inverter technology.",
    products: [
      {
        name: "LG 1.5 Ton Split AC",
        description: "Inverter split AC with dual-cool convertible modes.",
        basePrice: 37999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Voltas 1 Ton Window AC",
        description:
          "Reliable window AC with high-density anti-corrosive coating.",
        basePrice: 26999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Daikin 1.5 Ton Inverter AC",
        description: "Energy-efficient inverter AC with coanda airflow design.",
        basePrice: 43999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Samsung 2 Ton Split AC",
        description: "Powerful split AC with WindFree cooling technology.",
        basePrice: 52999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Blue Star 1.5 Ton AC",
        description: "Split AC with turbo cool and dust filtration.",
        basePrice: 39999,
        options: [{ name: "Color", values: ["White"] }],
      },
      {
        name: "Hitachi 1 Ton Split AC",
        description: "Compact split AC ideal for small to medium rooms.",
        basePrice: 31999,
        options: [{ name: "Color", values: ["White"] }],
      },
    ],
  },
  {
    name: "Headphones & Earphones",
    description: "Wired and wireless headphones, earbuds and neckbands.",
    products: [
      {
        name: "Sony WH-1000XM5",
        description: "Industry-leading noise-cancelling over-ear headphones.",
        basePrice: 29990,
        options: [{ name: "Color", values: ["Black", "White", "Blue"] }],
      },
      {
        name: "boAt Rockerz 450",
        description:
          "Wireless on-ear headphones with up to 15 hours of playback.",
        basePrice: 1499,
        options: [{ name: "Color", values: ["Black", "White", "Blue"] }],
      },
      {
        name: "JBL Tune 760NC",
        description:
          "Noise-cancelling wireless headphones with punchy JBL bass.",
        basePrice: 4999,
        options: [{ name: "Color", values: ["Black", "White", "Blue"] }],
      },
      {
        name: "Apple AirPods Pro",
        description: "Active noise cancellation earbuds with spatial audio.",
        basePrice: 24900,
        options: [{ name: "Color", values: ["Black", "White", "Blue"] }],
      },
      {
        name: "Samsung Galaxy Buds2",
        description: "Compact true wireless earbuds with ANC and rich sound.",
        basePrice: 9999,
        options: [{ name: "Color", values: ["Black", "White", "Blue"] }],
      },
      {
        name: "Sennheiser HD 450BT",
        description: "Wireless over-ear headphones tuned for balanced sound.",
        basePrice: 8999,
        options: [{ name: "Color", values: ["Black", "White", "Blue"] }],
      },
    ],
  },
  {
    name: "Speakers",
    description: "Portable Bluetooth speakers and smart speakers.",
    products: [
      {
        name: "JBL Flip 6",
        description: "Portable waterproof Bluetooth speaker with punchy bass.",
        basePrice: 9999,
        options: [{ name: "Color", values: ["Black", "Blue"] }],
      },
      {
        name: "Sony SRS-XB13",
        description: "Compact party-proof speaker with extra bass.",
        basePrice: 2999,
        options: [{ name: "Color", values: ["Black", "Blue"] }],
      },
      {
        name: "boAt Stone 1200",
        description: "Rugged Bluetooth speaker with RGB lighting effects.",
        basePrice: 2499,
        options: [{ name: "Color", values: ["Black", "Blue"] }],
      },
      {
        name: "Marshall Emberton",
        description: "Iconic-styled portable speaker with rich, dynamic sound.",
        basePrice: 12999,
        options: [{ name: "Color", values: ["Black", "Blue"] }],
      },
      {
        name: "Amazon Echo Dot",
        description: "Smart speaker with Alexa voice assistant built in.",
        basePrice: 4499,
        options: [{ name: "Color", values: ["Black", "Blue"] }],
      },
    ],
  },
];

// -------------------------------------------------------------------------
// Seed logic
// -------------------------------------------------------------------------

async function seedCategory(categoryDef: CategoryDef) {
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

  const product = await prisma.product.create({
    data: {
      name: productDef.name,
      slug: productSlug,
      description: productDef.description,
      categoryId,
      baseImage: placeholderImage(productSlug),
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

    // productSlug is unique per product (unique in schema), so appending the
    // index alone guarantees a unique SKU code. Do NOT truncate the slug —
    // truncating caused collisions between products with similar name
    // prefixes (e.g. "Samsung Galaxy S24" vs "Samsung Galaxy A54").
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
        imageUrl: placeholderImage(`${productSlug}-${skuIndex}`),
        optionValues: {
          connect: optionValueIds,
        },
      },
    });
  }

  console.log(`  Created product: ${product.name} (${combos.length} SKUs)`);
}

async function cleanup() {
  // Deleting categories cascades to Product -> (ProductOption -> ProductOptionValue)
  // and Product -> ProductSKU, per the onDelete: Cascade relations in the schema.
  // CartItem/OrderItem reference SKUs with their own cascade/SetNull rules and
  // are left untouched here.
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
