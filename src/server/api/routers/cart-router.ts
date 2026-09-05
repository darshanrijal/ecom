import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import z from "zod";

const quantitySchema = z.number().int().positive().max(999);

export const cartRouter = router({
  getCartItems: protectedProcedure.query(async ({ ctx }) => {
    const cart = await ctx.db.cart.findUnique({
      where: {
        userId: ctx.user.id,
      },
      select: {
        items: true,
      },
    });

    return cart?.items ?? [];
  }),

  addToCart: protectedProcedure
    .input(
      z.object({
        skuId: z.cuid2(),
        quantity: quantitySchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cart = await ctx.db.cart.findUnique({
        where: {
          userId: ctx.user.id,
        },
        select: {
          id: true,
        },
      });

      if (!cart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cart not found",
        });
      }

      await ctx.db.cartItem.upsert({
        where: {
          cartId_skuId: {
            cartId: cart.id,
            skuId: input.skuId,
          },
        },

        create: {
          cartId: cart.id,
          skuId: input.skuId,
          quantity: input.quantity,
        },

        update: {
          quantity: {
            increment: input.quantity,
          },
        },
      });
    }),

  removeItem: protectedProcedure
    .input(
      z.object({
        skuId: z.cuid2(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cart = await ctx.db.cart.findUnique({
        where: {
          userId: ctx.user.id,
        },
        select: {
          id: true,
        },
      });

      if (!cart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cart not found",
        });
      }

      await ctx.db.cartItem.delete({
        where: {
          cartId_skuId: {
            cartId: cart.id,
            skuId: input.skuId,
          },
        },
      });
    }),

  updateQuantity: protectedProcedure
    .input(
      z.object({
        skuId: z.cuid2(),
        quantity: quantitySchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cart = await ctx.db.cart.findUnique({
        where: {
          userId: ctx.user.id,
        },
        select: {
          id: true,
        },
      });

      if (!cart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cart not found",
        });
      }

      await ctx.db.cartItem.update({
        where: {
          cartId_skuId: {
            cartId: cart.id,
            skuId: input.skuId,
          },
        },
        data: {
          quantity: input.quantity,
        },
      });
    }),

  createCart: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.cart.upsert({
      create: {
        userId: ctx.user.id,
      },
      update: {},
      where: {
        userId: ctx.user.id,
      },
    });
  }),
  removeAllItems: protectedProcedure.mutation(async ({ ctx }) => {
    const cart = await ctx.db.cart.findUnique({
      where: {
        userId: ctx.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!cart) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Cart not found",
      });
    }

    await ctx.db.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });
  }),
});
