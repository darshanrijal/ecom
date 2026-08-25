import z from "zod";
import {
  createCallerFactory,
  protectedProcedure,
  publicProcedure,
  router,
} from "./trpc";
import { cartRouter } from "./routers/cart-router";

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
    return sessions;
  }),
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.string().nonempty() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.session.delete({
        where: {
          id: input.sessionId,
          userId: ctx.user.id,
        },
      });
    }),
  cart: cartRouter,
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
