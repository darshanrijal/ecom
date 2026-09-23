import z from "zod";
import { TRPCError } from "@trpc/server";
import {
  createCallerFactory,
  protectedProcedure,
  publicProcedure,
  router,
} from "./trpc";
import { cartRouter } from "./routers/cart-router";
import { orderRouter } from "./routers/order-router";
import { productRouter } from "./routers/product-router";
import { reviewRouter } from "./routers/review-router";

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: "OK",
    timestamp: new Date(),
  })),
  getActiveSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await ctx.db.session.findMany({
      where: {
        userId: ctx.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    const data = sessions.map(
      ({ token, expiresAt, updatedAt, userId, ...others }) => others
    );
    return data;
  }),
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.string().nonempty() }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.session.deleteMany({
        where: {
          id: input.sessionId,
          userId: ctx.user.id,
        },
      });

      if (count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }
    }),
  cart: cartRouter,
  orders: orderRouter,
  products: productRouter,
  reviews: reviewRouter,
});

export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
