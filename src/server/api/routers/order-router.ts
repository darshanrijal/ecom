import { TRPCError } from "@trpc/server";
import {
  canChangePaymentMethod,
  changePaymentMethodSchema,
  createOrderSchema,
  isCustomerCancellable,
  listOrdersSchema,
  orderByIdSchema,
  type PaymentMethod,
  type ShippingInfo,
} from "@/lib/order-schema";
import { quoteDelivery } from "@/lib/delivery";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import { ensureRefund, restockItems } from "./order-helpers";

const orderInclude = {
  items: {
    include: {
      sku: {
        select: {
          imageUrl: true,
          product: { select: { slug: true } },
        },
      },
    },
  },
  refund: true,
};

interface OrderRecord {
  id: string;
  userId: string | null;
  status: string;
  paymentMethod: PaymentMethod;
  paidAt: Date | null;
  paymentRef: string | null;
  totalAmount: { toNumber: () => number };
  subtotal: { toNumber: () => number };
  discountAmount: { toNumber: () => number };
  deliveryCharge: { toNumber: () => number };
  deliveryDistanceKm: { toNumber: () => number } | null;
  deliveryRatePerKm: { toNumber: () => number } | null;
  shippingInfo: unknown;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productName: string;
    skuCode: string;
    quantity: number;
    unitPrice: { toNumber: () => number };
    totalPrice: { toNumber: () => number };
    sku: {
      imageUrl: string;
      product: { slug: string };
    } | null;
  }>;
  refund: {
    status: string;
    amount: { toNumber: () => number };
    reason: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

function serializeOrder(order: OrderRecord) {
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paidAt: order.paidAt,
    paymentRef: order.paymentRef,
    totalAmount: order.totalAmount.toNumber(),
    subtotal: order.subtotal.toNumber(),
    discountAmount: order.discountAmount.toNumber(),
    deliveryCharge: order.deliveryCharge.toNumber(),
    deliveryDistanceKm: order.deliveryDistanceKm
      ? order.deliveryDistanceKm.toNumber()
      : null,
    deliveryRatePerKm: order.deliveryRatePerKm
      ? order.deliveryRatePerKm.toNumber()
      : null,
    shippingInfo: order.shippingInfo as ShippingInfo,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      skuCode: item.skuCode,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toNumber(),
      totalPrice: item.totalPrice.toNumber(),
      imageUrl: item.sku?.imageUrl ?? null,
      slug: item.sku?.product.slug ?? null,
    })),
    refund: order.refund
      ? {
          status: order.refund.status,
          amount: order.refund.amount.toNumber(),
          reason: order.refund.reason,
          createdAt: order.refund.createdAt,
          updatedAt: order.refund.updatedAt,
        }
      : null,
  };
}

// Guest orders (userId null) are guarded by possession of their id — the
// same model getById, orders.list and the payment routes already use.
function assertOrderOwnership(
  order: { userId: string | null },
  sessionUserId: string | undefined
) {
  if (order.userId && order.userId !== sessionUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This order belongs to another account",
    });
  }
}

export const orderRouter = router({
  create: publicProcedure
    .input(createOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null;

      return await ctx.db.$transaction(async (tx) => {
        const skuIds = input.items.map((item) => item.skuId);
        const skus = await tx.productSKU.findMany({
          where: { id: { in: skuIds } },
          include: { product: { select: { name: true } } },
        });
        const skuById = new Map(skus.map((sku) => [sku.id, sku]));

        const lines = input.items.map((item) => {
          const sku = skuById.get(item.skuId);

          if (!sku) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "One of the items in your cart is no longer available",
            });
          }

          if (sku.stock < item.quantity) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                sku.stock === 0
                  ? `${sku.product.name} is out of stock`
                  : `Only ${sku.stock} left in stock for ${sku.product.name}`,
            });
          }

          return { sku, quantity: item.quantity };
        });

        const subtotal = lines.reduce(
          (sum, line) => sum + Number(line.sku.price) * line.quantity,
          0
        );

        // The delivery charge is always recalculated here — the client never
        // sends it, and this quote becomes the order's historical snapshot.
        const setting = await tx.storeSetting.findUnique({
          where: { id: "main" },
        });
        const storeLat = setting?.storeLat ?? null;
        const storeLng = setting?.storeLng ?? null;
        const rateDecimal = setting?.deliveryRatePerKm ?? null;
        const ratePerKm =
          rateDecimal === null
            ? null
            : Math.round(Number(rateDecimal) * 100) / 100;
        const quote = quoteDelivery({
          store:
            storeLat !== null && storeLng !== null
              ? { lat: storeLat, lng: storeLng }
              : null,
          customer: {
            lat: input.shippingInfo.deliveryLat,
            lng: input.shippingInfo.deliveryLng,
          },
          ratePerKm,
        });
        const totalAmount =
          Math.round((subtotal + quote.deliveryCharge) * 100) / 100;

        const order = await tx.order.create({
          data: {
            userId,
            totalAmount,
            subtotal,
            discountAmount: 0,
            deliveryCharge: quote.deliveryCharge,
            deliveryDistanceKm: quote.distanceKm,
            deliveryRatePerKm: ratePerKm,
            storeLat,
            storeLng,
            paymentMethod: input.paymentMethod,
            shippingInfo: {
              ...input.shippingInfo,
              email: input.shippingInfo.email || null,
              note: input.shippingInfo.note || null,
            },
            items: {
              create: lines.map(({ sku, quantity }) => ({
                skuId: sku.id,
                productName: sku.product.name,
                skuCode: sku.sku,
                quantity,
                unitPrice: sku.price,
                totalPrice: Number(sku.price) * quantity,
              })),
            },
          },
          include: orderInclude,
        });

        for (const { sku, quantity } of lines) {
          // biome-ignore lint/performance/noAwaitInLoops: each line's stock check must run in order inside the transaction
          const result = await tx.productSKU.updateMany({
            where: { id: sku.id, stock: { gte: quantity } },
            data: { stock: { decrement: quantity } },
          });

          if (result.count === 0) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `${sku.product.name} just went out of stock`,
            });
          }
        }

        if (userId) {
          await tx.cartItem.deleteMany({
            where: { skuId: { in: skuIds }, cart: { userId } },
          });
        }

        return serializeOrder(order);
      });
    }),

  getById: publicProcedure
    .input(orderByIdSchema)
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: orderInclude,
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      assertOrderOwnership(order, ctx.session?.user?.id);

      return serializeOrder(order);
    }),

  list: publicProcedure
    .input(listOrdersSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null;

      type OrderWhere =
        | { userId: string }
        | { id: { in: string[] }; userId: null };

      const clauses: OrderWhere[] = [];

      if (userId) {
        clauses.push({ userId });
      }

      if (input.orderIds.length > 0) {
        clauses.push({ id: { in: input.orderIds }, userId: null });
      }

      if (clauses.length === 0) {
        return [];
      }

      const orders = await ctx.db.order.findMany({
        where: { OR: clauses },
        include: orderInclude,
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return orders.map((order) => serializeOrder(order));
    }),
  cancel: publicProcedure
    .input(orderByIdSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: orderInclude,
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }
      assertOrderOwnership(order, ctx.session?.user?.id);

      if (!isCustomerCancellable(order.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This order can no longer be cancelled online. Contact support for help.",
        });
      }

      const cancelled = await ctx.db.$transaction(async (tx) => {
        await restockItems(tx, order.items);
        // Money was already collected (wallet payment) — open a refund for the
        // full amount; unpaid orders simply stop here. Runs before the update
        // so the row returned by this mutation carries the new refund.
        if (order.paidAt) {
          await ensureRefund(tx, order, "PENDING", "Cancelled by the customer");
        }
        return tx.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
          include: orderInclude,
        });
      });

      return serializeOrder(cancelled);
    }),

  changePaymentMethod: publicProcedure
    .input(changePaymentMethodSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: orderInclude,
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }
      assertOrderOwnership(order, ctx.session?.user?.id);

      if (!canChangePaymentMethod(order)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: order.paidAt
            ? "This order has already been paid."
            : "The payment method can only be changed before the order is processed.",
        });
      }

      if (order.paymentMethod === input.paymentMethod) {
        return serializeOrder(order);
      }

      // clear the previous gateway session so an abandoned initiation can
      // never be verified against the new method
      const updated = await ctx.db.order.update({
        where: { id: order.id },
        data: {
          paymentMethod: input.paymentMethod,
          paymentRef: null,
          esewaTransactionUuid: null,
          khaltiPidx: null,
        },
        include: orderInclude,
      });

      return serializeOrder(updated);
    }),

  getAllOrderIds: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.db.order.findMany({
      where: { userId: ctx.user.id },
      select: { id: true },
    });

    return data.map((d) => d.id);
  }),
});
