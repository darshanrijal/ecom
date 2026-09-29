import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { addressCreateSchema } from "@/lib/order-schema";
import { protectedProcedure, router } from "../trpc";

/** Hard cap so a compromised session can't spam the table. */
const MAX_SAVED_ADDRESSES = 5;

const addressSelect = {
  id: true,
  fullName: true,
  phone: true,
  province: true,
  city: true,
  address: true,
  lat: true,
  lng: true,
  updatedAt: true,
} as const;

export const addressRouter = router({
  list: protectedProcedure.query(async ({ ctx }) =>
    ctx.db.address.findMany({
      where: { userId: ctx.user.id },
      orderBy: { updatedAt: "desc" },
      select: addressSelect,
    })
  ),

  create: protectedProcedure
    .input(addressCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const data = {
        fullName: input.fullName ? input.fullName : null,
        phone: input.phone ? input.phone : null,
        province: input.province,
        city: input.city,
        address: input.address,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
      };

      // Same location saved twice (maybe with an updated recipient) refreshes
      // the existing row instead of piling up duplicates.
      const duplicate = await ctx.db.address.findFirst({
        where: {
          userId: ctx.user.id,
          province: input.province,
          city: input.city,
          address: input.address,
        },
        select: { id: true },
      });
      if (duplicate) {
        return ctx.db.address.update({
          where: { id: duplicate.id },
          data,
          select: addressSelect,
        });
      }

      const saved = await ctx.db.address.count({
        where: { userId: ctx.user.id },
      });
      if (saved >= MAX_SAVED_ADDRESSES) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `You can save up to ${MAX_SAVED_ADDRESSES} addresses. Remove one to add another.`,
        });
      }

      return ctx.db.address.create({
        data: { ...data, userId: ctx.user.id },
        select: addressSelect,
      });
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.cuid2() }))
    .mutation(async ({ ctx, input }) => {
      const address = await ctx.db.address.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });
      if (!address) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Address not found.",
        });
      }
      if (address.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This address belongs to another account.",
        });
      }
      await ctx.db.address.delete({ where: { id: input.id } });
      return { id: input.id };
    }),
});
