import z from "zod";
import { publicProcedure, router } from "../trpc";
import { TRPCError } from "@trpc/server";

/** Prisma Decimal -> number so responses survive JSON serialization. */
function serializeSku<T extends { price: unknown; originalPrice: unknown }>(
  sku: T
) {
  return {
    ...sku,
    price: Number(sku.price),
    originalPrice: sku.originalPrice ? Number(sku.originalPrice) : null,
  };
}

/** Prisma Decimal -> number so responses survive JSON serialization. */
// biome-ignore lint/suspicious/noExplicitAny: shared across all product queries
function serializeProducts<T extends { productSKUs: any[] }>(products: T[]) {
  return products.map((product) => ({
    ...product,
    productSKUs: product.productSKUs.map((sku) => serializeSku(sku)),
  }));
}

/** Card-friendly discount % between SKU price and originalPrice. */
function discountPercent(sku?: {
  price: number;
  originalPrice: number | null;
}) {
  if (!sku?.originalPrice || sku.originalPrice <= sku.price) {
    return 0;
  }
  return Math.round(
    ((sku.originalPrice - sku.price) / sku.originalPrice) * 100
  );
}

/** The lowest-priced SKU is the one ProductCard displays. */
const lowestPricedSku = {
  orderBy: { price: "asc" as const },
  take: 1,
};

export const productRouter = router({
  getAllProducts: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(15),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, cursor } = input;

      const products = await ctx.db.product.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: { id: "asc" },
        include: {
          productSKUs: lowestPricedSku,
        },
      });

      let nextCursor: typeof cursor;

      if (products.length > limit) {
        const nextItem = products.pop(); // Remove the +1 check item
        nextCursor = nextItem?.id; // The pop'd item's ID becomes the next cursor start point
      }

      return {
        products: serializeProducts(products),
        nextCursor,
      };
    }),

  getProductVariants: publicProcedure
    .input(z.object({ productId: z.cuid2() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: {
          id: input.productId,
        },
        select: {
          options: {
            include: {
              values: true,
            },
          },

          productSKUs: {
            select: {
              id: true,
              price: true,
              originalPrice: true,
              stock: true,
              imageUrl: true,

              optionValues: {
                select: {
                  id: true,
                  value: true,
                  optionId: true,
                },
              },
            },
          },
        },
      });

      if (!product) {
        return null;
      }

      return {
        options: product.options,
        skus: product.productSKUs.map((sku) => serializeSku(sku)),
      };
    }),

  getProductBySKU: publicProcedure
    .input(z.object({ skuId: z.cuid2() }))
    .query(async ({ ctx, input }) => {
      const productSKU = await ctx.db.productSKU.findUnique({
        where: {
          id: input.skuId,
        },
        include: {
          product: true,
          optionValues: {
            include: {
              option: true,
            },
          },
        },
      });

      if (!productSKU) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No such sku exists",
        });
      }
      return serializeSku(productSKU);
    }),

  getSKUsByIds: publicProcedure
    .input(z.object({ skuIds: z.array(z.cuid2()).min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const skus = await ctx.db.productSKU.findMany({
        where: { id: { in: input.skuIds } },
        include: {
          product: { select: { id: true, name: true, slug: true } },
          optionValues: { include: { option: true } },
        },
      });

      return skus.map((sku) => serializeSku(sku));
    }),

  getProductBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: {
          slug: input.slug,
        },
        include: {
          category: true,
          options: {
            include: {
              values: true,
            },
          },
          productSKUs: {
            include: {
              optionValues: true,
            },
            orderBy: {
              price: "asc",
            },
          },
        },
      });

      if (!product) {
        return null;
      }

      return {
        ...product,
        productSKUs: product.productSKUs.map((sku) => ({
          ...sku,
          price: sku.price.toNumber(),
          originalPrice: sku.originalPrice.toNumber(),
        })),
      };
    }),

  /** Same-category siblings for the "You may also like" strip. */
  getRelatedProducts: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        limit: z.number().min(1).max(12).default(4),
      })
    )
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { slug: input.slug },
        select: { id: true, categoryId: true },
      });

      if (!product) {
        return { products: [] };
      }

      const products = await ctx.db.product.findMany({
        where: {
          categoryId: product.categoryId,
          id: { not: product.id },
          isPublished: true,
          archivedAt: null,
        },
        orderBy: { id: "asc" },
        take: input.limit,
        include: { productSKUs: lowestPricedSku },
      });

      return { products: serializeProducts(products) };
    }),

  searchProduct: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(15),
        cursor: z.string().nullish(),
        search: z.string().min(1),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, cursor, search } = input;

      const products = await ctx.db.product.findMany({
        take: limit + 1,
        where: {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              category: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          ],
        },
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: { id: "asc" },
        include: {
          productSKUs: lowestPricedSku,
        },
      });

      let nextCursor: string | undefined;

      if (products.length > limit) {
        const nextItem = products.pop();
        nextCursor = nextItem?.id;
      }

      return {
        products: serializeProducts(products),
        nextCursor,
      };
    }),
  getProductsByCategorySlug: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(15),
        cursor: z.string().nullish(),
        categorySlug: z.string().nonempty(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, cursor, categorySlug } = input;

      const products = await ctx.db.product.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        where: {
          category: {
            OR: [
              {
                name: {
                  contains: categorySlug,
                  mode: "insensitive",
                },
              },
              {
                slug: {
                  contains: categorySlug,
                  mode: "insensitive",
                },
              },
            ],
          },
        },
        orderBy: { id: "asc" },
        include: {
          productSKUs: lowestPricedSku,
        },
      });

      let nextCursor: typeof cursor;

      if (products.length > limit) {
        const nextItem = products.pop(); // Remove the +1 check item
        nextCursor = nextItem?.id; // The pop'd item's ID becomes the next cursor start point
      }

      return {
        products: serializeProducts(products),
        nextCursor,
      };
    }),

  getHomeData: publicProcedure.query(async ({ ctx }) => {
    const products = await ctx.db.product.findMany({
      where: { isPublished: true, archivedAt: null },
      orderBy: { id: "desc" },
      include: {
        productSKUs: lowestPricedSku,
        category: { select: { name: true, slug: true } },
      },
    });
    const serialized = serializeProducts(products);

    // Categories with a sample product image + product count.
    const categoryMap = new Map<
      string,
      {
        id: string;
        productCount: number;
        sampleImage: string | null;
      }
    >();
    for (const product of serialized) {
      const existing = categoryMap.get(product.categoryId);
      if (existing) {
        existing.productCount += 1;
        continue;
      }
      categoryMap.set(product.categoryId, {
        id: product.categoryId,
        productCount: 1,
        sampleImage: product.baseImage,
      });
    }

    // Full category list (even categories whose products are all hidden).
    const categories = await ctx.db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, description: true },
    });

    const categoriesWithMeta = categories.map((category) => {
      const meta = categoryMap.get(category.id);
      return {
        ...category,
        productCount: meta?.productCount ?? 0,
        sampleImage: meta?.sampleImage ?? null,
      };
    });

    // Top deals: biggest discount on the displayed (lowest) SKU first.
    type HomeProduct = (typeof serialized)[number];
    const deals: Array<HomeProduct & { discount: number }> = [];
    for (const product of serialized) {
      const discount = discountPercent(product.productSKUs[0]);
      if (discount > 0) {
        deals.push({ ...product, discount });
      }
    }
    deals.sort((a, b) => b.discount - a.discount || a.id.localeCompare(b.id));

    // Popular picks: latest product from each category for a varied grid.
    const seenCategories = new Set<string>();
    const popular: HomeProduct[] = [];
    for (const product of serialized) {
      if (seenCategories.has(product.categoryId)) {
        continue;
      }
      seenCategories.add(product.categoryId);
      popular.push(product);
    }

    return {
      categories: categoriesWithMeta,
      deals: deals.slice(0, 8),
      popular: popular.slice(0, 8),
      stats: {
        categoryCount: categories.length,
        productCount: products.length,
      },
    };
  }),
});
