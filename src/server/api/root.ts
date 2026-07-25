import { createCallerFactory, publicProcedure, router } from "./trpc";

export const appRouter = router({
  getServerDateTime: publicProcedure.query(() => new Date()),
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
