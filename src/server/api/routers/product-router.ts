import z from "zod";
import { publicProcedure, router } from "../trpc";
import { TRPCError } from "@trpc/server";

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
          productSKUs: {
            orderBy: {
              price: "asc",
            },
            take: 1,
          },
        },
      });

      let nextCursor: typeof cursor;

      if (products.length > limit) {
        const nextItem = products.pop(); // Remove the +1 check item
        nextCursor = nextItem?.id; // The pop'd item's ID becomes the next cursor start point
      }

      return {
        products,
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
        skus: product.productSKUs,
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
      return productSKU;
    }),
});
