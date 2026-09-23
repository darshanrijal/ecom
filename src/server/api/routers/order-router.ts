import { TRPCError } from "@trpc/server";
import { createId } from "@paralleldrive/cuid2";
import { env } from "@/config/env";
import {
  buildEsewaInitForm,
  checkTransactionStatus,
  isEsewaSuccess,
  newTransactionUuid,
} from "@/lib/esewa";
import {
  completePaymentSchema,
  createOrderSchema,
  listOrdersSchema,
  orderByIdSchema,
  type ShippingInfo,
} from "@/lib/order-schema";
import { publicProcedure, router } from "../trpc";

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
};

const TRAILING_SLASH = /\/$/;

interface OrderRecord {
  id: string;
  userId: string | null;
  status: string;
  paymentMethod: string;
  paidAt: Date | null;
  paymentRef: string | null;
  esewaTransactionUuid: string | null;
  totalAmount: { toNumber: () => number };
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
}

function serializeOrder(order: OrderRecord) {
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paidAt: order.paidAt,
    paymentRef: order.paymentRef,
    esewaTransactionUuid: order.esewaTransactionUuid,
    totalAmount: order.totalAmount.toNumber(),
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
  };
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

        const totalAmount = lines.reduce(
          (sum, line) => sum + Number(line.sku.price) * line.quantity,
          0
        );

        const order = await tx.order.create({
          data: {
            userId,
            totalAmount,
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

  initiateEsewaPayment: publicProcedure
    .input(orderByIdSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      if (order.userId && order.userId !== ctx.session?.user?.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This order belongs to another account",
        });
      }

      if (order.paymentMethod !== "ESEWA") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This order does not use eSewa",
        });
      }

      if (order.status === "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This order is already paid",
        });
      }

      if (order.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This order can no longer be paid",
        });
      }

      const transactionUuid = newTransactionUuid();

      await ctx.db.order.update({
        where: { id: order.id },
        data: { esewaTransactionUuid: transactionUuid },
      });

      const baseUrl = env.NEXT_PUBLIC_BASE_URL.replace(TRAILING_SLASH, "");

      return buildEsewaInitForm({
        amount: order.totalAmount.toNumber(),
        transactionUuid,
        successUrl: `${baseUrl}/api/payments/esewa/success`,
        failureUrl: `${baseUrl}/checkout/payment-failed`,
      });
    }),

  completePayment: publicProcedure
    .input(completePaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: orderInclude,
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      if (order.userId && order.userId !== ctx.session?.user?.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This order belongs to another account",
        });
      }

      if (order.status === "PAID") {
        return serializeOrder(order);
      }

      if (order.paymentMethod === "COD") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This order is paid on delivery",
        });
      }

      if (order.paymentMethod === "ESEWA") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This order is paid through eSewa — complete the payment on the eSewa checkout page",
        });
      }

      if (order.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This order can no longer be paid",
        });
      }

      const paymentRef = `KHALT-${createId().slice(0, 12).toUpperCase()}`;

      const updated = await ctx.db.order.update({
        where: { id: order.id },
        data: { status: "PAID", paidAt: new Date(), paymentRef },
        include: orderInclude,
      });

      return serializeOrder(updated);
    }),

  verifyEsewaPayment: publicProcedure
    .input(orderByIdSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: orderInclude,
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      if (order.userId && order.userId !== ctx.session?.user?.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This order belongs to another account",
        });
      }

      if (order.paymentMethod !== "ESEWA") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This order does not use eSewa",
        });
      }

      if (order.status === "PAID") {
        return serializeOrder(order);
      }

      if (order.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This order can no longer be paid",
        });
      }

      if (!order.esewaTransactionUuid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No eSewa payment has been started for this order",
        });
      }

      const status = await checkTransactionStatus({
        transactionUuid: order.esewaTransactionUuid,
        totalAmount: order.totalAmount.toNumber(),
      });

      const confirmed =
        status !== null &&
        isEsewaSuccess(status.status) &&
        Number(status.total_amount) === order.totalAmount.toNumber();

      if (!confirmed) {
        return serializeOrder(order);
      }

      const paymentRef = `ESWA-${status.ref_id ?? order.esewaTransactionUuid}`;

      const updated = await ctx.db.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paymentRef,
          esewaRefId: status.ref_id,
        },
        include: orderInclude,
      });

      return serializeOrder(updated);
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

      if (order.userId && order.userId !== ctx.session?.user?.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This order belongs to another account",
        });
      }

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
});
