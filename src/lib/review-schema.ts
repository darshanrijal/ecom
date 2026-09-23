import z from "zod";

export const reviewBodySchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Pick a star rating")
    .max(5, "A rating can't be more than 5 stars"),
  comment: z
    .string()
    .trim()
    .max(2000, "Your review is too long (2000 characters max)"),
});

export type ReviewBody = z.infer<typeof reviewBodySchema>;

export const createReviewSchema = reviewBodySchema.extend({
  productId: z.cuid2(),
});

export const deleteReviewSchema = z.object({
  reviewId: z.cuid2(),
});

export const reviewListSchema = z.object({
  productId: z.cuid2(),
});
