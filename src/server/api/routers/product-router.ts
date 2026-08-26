import z from "zod";
import { publicProcedure, router } from "../trpc";
import { db } from "@/lib/prisma";

export const productRouter = router({
  getAllProducts: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(15),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ input }) => {
      const { limit, cursor } = input;

      const products = await db.product.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: { id: "asc" },
        include: {
          productSKUs: {
            include: {
              optionValues: {
                include: { option: true },
              },
            },
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
});
