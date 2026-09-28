import z from "zod";
import { protectedProcedure, router } from "../trpc";

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

/** The lowest-priced SKU is the one ProductCard displays. */
const lowestPricedSku = {
  orderBy: { price: "asc" as const },
  take: 1,
};

export const favoriteRouter = router({
  toggle: protectedProcedure
    .input(
      z.object({
        productId: z.cuid2(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.favorite.findUnique({
        where: {
          productId_userId: {
            userId: ctx.user.id,
            productId: input.productId,
          },
        },
      });

      if (existing) {
        await ctx.db.favorite.delete({
          where: {
            id: existing.id,
          },
        });

        return {
          isFavorited: false,
        };
      }

      await ctx.db.favorite.create({
        data: {
          userId: ctx.user.id,
          productId: input.productId,
        },
      });

      return {
        isFavorited: true,
      };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const allFavorites = await ctx.db.favorite.findMany({
      where: {
        userId: ctx.user.id,
      },
      include: {
        favoriatedProduct: {
          include: {
            productSKUs: lowestPricedSku,
          },
        },
      },
    });

    return allFavorites.map((favorite) => {
      const { productSKUs, ...product } = favorite.favoriatedProduct;

      return {
        ...product,
        productSKUs: productSKUs.map((sku) => serializeSku(sku)),
      };
    });
  }),

  check: protectedProcedure
    .input(z.object({ productId: z.cuid2() }))
    .query(async ({ ctx, input }) => {
      const favorate = await ctx.db.favorite.findUnique({
        where: {
          productId_userId: {
            productId: input.productId,
            userId: ctx.user.id,
          },
        },
      });

      const data = {
        favoratedRow: favorate,
        isFavorated: !!favorate,
      };

      return data;
    }),
});
