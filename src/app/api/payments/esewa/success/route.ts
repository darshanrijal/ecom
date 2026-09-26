import { env } from "@/config/env";
import {
  checkTransactionStatus,
  decodeEsewaCallback,
  esewaConfig,
  isEsewaSuccess,
  type EsewaCallback,
} from "@/lib/esewa";
import { db } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

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
  const data = request.nextUrl.searchParams.get("data");

  if (!data) {
    return NextResponse.redirect(failureUrl());
  }

  let callback: EsewaCallback;
  try {
    callback = decodeEsewaCallback(data);
  } catch {
    return NextResponse.redirect(failureUrl());
  }

  if (callback.product_code !== esewaConfig().productCode) {
    return NextResponse.redirect(failureUrl());
  }

  const order = await db.order.findFirst({
    where: { esewaTransactionUuid: callback.transaction_uuid },
  });

  if (order?.paymentMethod !== "ESEWA") {
    return NextResponse.redirect(failureUrl());
  }

  if (order.status === "PAID" || order.status !== "PENDING") {
    return NextResponse.redirect(ordersUrl(order.id));
  }

  const status = await checkTransactionStatus({
    transactionUuid: callback.transaction_uuid,
    totalAmount: order.totalAmount.toNumber(),
  });

  const confirmed =
    status !== null &&
    isEsewaSuccess(status.status) &&
    Number(status.total_amount) === order.totalAmount.toNumber();

  if (!confirmed) {
    return NextResponse.redirect(failureUrl(order.id));
  }

  const paymentRef = `ESWA-${status.ref_id ?? callback.transaction_code}`;

  await db.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paymentRef,
      esewaRefId: status.ref_id,
    },
  });

  return NextResponse.redirect(ordersUrl(order.id), 303);
}
