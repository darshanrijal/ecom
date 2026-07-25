import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import z, { ZodError } from "zod";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const sessionData = await auth.api.getSession({
    headers: opts.headers,
  });
  return {
    db,
    sessionData,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? z.treeifyError(error.cause) : null,
      },
    };
  },
});

export const { createCallerFactory, router } = t;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.sessionData?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.sessionData.session,
      user: ctx.sessionData.user,
    },
  });
});
