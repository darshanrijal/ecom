import type { Tx } from "./admin-helpers";

/** Returns ordered quantities to their SKUs; used when an order is reversed. */
export async function restockItems(
  tx: Tx,
  items: Array<{ skuId: string | null; quantity: number }>
) {
  for (const item of items) {
    if (!item.skuId) {
      continue;
    }
    // biome-ignore lint/performance/noAwaitInLoops: a transaction client must run queries sequentially
    await tx.productSKU.update({
      where: { id: item.skuId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

interface RefundableOrder {
  id: string;
  totalAmount: { toNumber: () => number };
}

/**
 * Makes sure a paid, reversed order (cancelled or refunded) carries a Refund
 * row for its full paid amount. PENDING refunds are created once and never
 * touched afterwards — the admin advances them via admin.updateRefundStatus;
 * only an order moving to REFUNDED may promote an existing refund outright.
 */
export async function ensureRefund(
  tx: Tx,
  order: RefundableOrder,
  status: "PENDING" | "REFUNDED",
  reason: string
) {
  const existing = await tx.refund.findUnique({
    where: { orderId: order.id },
    select: { id: true },
  });

  if (existing) {
    if (status === "REFUNDED") {
      await tx.refund.update({
        where: { orderId: order.id },
        data: { status: "REFUNDED", reason },
      });
    }
    return;
  }

  await tx.refund.create({
    data: {
      orderId: order.id,
      amount: order.totalAmount.toNumber(),
      status,
      reason,
    },
  });
}
