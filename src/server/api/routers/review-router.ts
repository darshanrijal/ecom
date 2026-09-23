import { TRPCError } from "@trpc/server";
import {
  createReviewSchema,
  deleteReviewSchema,
  reviewListSchema,
} from "@/lib/review-schema";
import { protectedProcedure, publicProcedure, router } from "../trpc";

const withAuthor = {
  include: {
    user: { select: { name: true, image: true } },
  },
};

export const reviewRouter = router({
  list: publicProcedure
    .input(reviewListSchema)
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        select: { id: true },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const reviews = await ctx.db.review.findMany({
        where: { productId: input.productId },
        orderBy: { createdAt: "desc" },
        ...withAuthor,
      });

      const count = reviews.length;
      const average =
        count === 0
          ? 0
          : Math.round(
              (reviews.reduce((sum, review) => sum + review.rating, 0) /
                count) *
                10
            ) / 10;

      const distribution = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((review) => review.rating === star).length,
      }));

      return {
        reviews,
        summary: { count, average, distribution },
      };
    }),

  create: protectedProcedure
    .input(createReviewSchema)
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        select: { id: true },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const values = {
        rating: input.rating,
        comment: input.comment === "" ? null : input.comment,
      };

      const existing = await ctx.db.review.findUnique({
        where: {
          userId_productId: {
            userId: ctx.user.id,
            productId: input.productId,
          },
        },
        select: { id: true },
      });

      if (existing) {
        return ctx.db.review.update({
          where: { id: existing.id },
          data: values,
          ...withAuthor,
        });
      }

      return ctx.db.review.create({
        data: {
          ...values,
          userId: ctx.user.id,
          productId: input.productId,
        },
        ...withAuthor,
      });
    }),

  delete: protectedProcedure
    .input(deleteReviewSchema)
    .mutation(async ({ ctx, input }) => {
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
        select: { userId: true },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      if (review.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only remove your own review",
        });
      }

      await ctx.db.review.delete({ where: { id: input.reviewId } });
    }),
});
