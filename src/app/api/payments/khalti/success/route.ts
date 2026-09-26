import { isKhaltiSuccess, lookupKhaltiPayment } from "@/lib/khalti";
import { db } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";

export const runtime = "nodejs";

const TRAILING_SLASH = /\/$/;

const baseUrl = () => env.NEXT_PUBLIC_BASE_URL.replace(TRAILING_SLASH, "");

function ordersUrl(orderId: string) {
  return `${baseUrl()}/orders?new=${encodeURIComponent(orderId)}`;
}

function failureUrl(orderId?: string) {
  const params = orderId ? `?orderId=${encodeURIComponent(orderId)}` : "";
  return `${baseUrl()}/checkout/payment-failed${params}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const pidx = searchParams.get("pidx");
  const status = searchParams.get("status");

  if (!pidx) {
    return NextResponse.redirect(failureUrl());
  }

  if (status === "User canceled") {
    return NextResponse.redirect(failureUrl());
  }

  const order = await db.order.findFirst({
    where: { khaltiPidx: pidx },
  });

  if (order?.paymentMethod !== "KHALTI") {
    return NextResponse.redirect(failureUrl());
  }

  if (order.status === "PAID" || order.status !== "PENDING") {
    return NextResponse.redirect(ordersUrl(order.id));
  }

  const lookup = await lookupKhaltiPayment(pidx);

  const confirmed =
    lookup !== null &&
    isKhaltiSuccess(lookup.status) &&
    lookup.total_amount === Math.round(order.totalAmount.toNumber() * 100) &&
    lookup.transaction_id !== null;

  if (!confirmed) {
    return NextResponse.redirect(failureUrl(order.id));
  }

  const paymentRef = `KHALT-${lookup.transaction_id}`;

  await db.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paymentRef,
      khaltiTransactionId: lookup.transaction_id,
    },
  });

  return NextResponse.redirect(ordersUrl(order.id), 303);
}
