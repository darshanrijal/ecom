import { createHmac, randomUUID } from "node:crypto";
import type { ShippingInfo } from "@/lib/order-schema";
import { env } from "@/config/env";
import { createTRPCContext } from "@/server/api/trpc";
import z from "zod";

const ESEWA_ENDPOINTS = {
  sandbox: {
    payment: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    status: "https://rc-epay.esewa.com.np/api/epay/transaction/status/",
  },
  production: {
    payment: "https://epay.esewa.com.np/api/epay/main/v2/form",
    status: "https://epay.esewa.com.np/api/epay/transaction/status/",
  },
} as const;

const KHALTI_ENDPOINTS = {
  sandbox: {
    initiate: "https://dev.khalti.com/api/v2/epayment/initiate/",
    lookup: "https://dev.khalti.com/api/v2/epayment/lookup/",
  },
  production: {
    initiate: "https://a.khalti.com/api/v2/epayment/initiate/",
    lookup: "https://khalti.com/api/v2/epayment/lookup/",
  },
} as const;

const initiateSchema = z.object({ orderId: z.cuid2() });

const TRAILING_SLASHES = /\/+$/;

function appBaseUrl() {
  return env.NEXT_PUBLIC_BASE_URL.replace(TRAILING_SLASHES, "");
}

function fail(message: string, status: number) {
  return Response.json({ status: "error", message }, { status });
}

function confirmed() {
  return Response.json({
    status: "success",
    message: "Payment verified successfully",
  });
}

function alreadyProcessed() {
  return Response.json({
    status: "success",
    message: "Payment already processed",
  });
}

async function loadOrder(request: Request, orderId: string) {
  const ctx = await createTRPCContext({ headers: request.headers });
  const order = await ctx.db.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { productName: true }, take: 1 } },
  });
  return { ctx, order };
}

type Loaded = Awaited<ReturnType<typeof loadOrder>>;
type PaymentOrder = NonNullable<Loaded["order"]>;
type CheckoutContext = Loaded["ctx"];

async function initiateEsewa(ctx: CheckoutContext, order: PaymentOrder) {
  const merchantCode = env.ESEWA_MERCHANT_CODE;
  const secretKey = env.ESEWA_SECRET_KEY;
  if (!merchantCode || !secretKey) {
    return fail("eSewa is not configured on this server", 503);
  }

  // eSewa rejects a transaction_uuid it has already seen, so every attempt
  // gets a fresh one; verification only accepts the latest issued uuid
  const transactionUuid = `${Date.now()}-${randomUUID()}`;
  const claimed = await ctx.db.order.updateMany({
    where: { id: order.id, paidAt: null },
    data: { esewaTransactionUuid: transactionUuid },
  });
  if (claimed.count === 0) {
    return fail("This order is already paid", 400);
  }

  const amount = order.totalAmount.toNumber().toFixed(2);
  const endpoints = ESEWA_ENDPOINTS[env.ESEWA_ENV ?? "sandbox"];
  const paymentPage = `${appBaseUrl()}/checkout/pay/${order.id}`;
  const signedMessage = `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${merchantCode}`;
  const signature = createHmac("sha256", secretKey)
    .update(signedMessage)
    .digest("base64");

  return Response.json({
    status: "success",
    paymentUrl: endpoints.payment,
    esewaConfig: {
      amount,
      tax_amount: "0",
      total_amount: amount,
      transaction_uuid: transactionUuid,
      product_code: merchantCode,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: paymentPage,
      failure_url: paymentPage,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature,
    },
  });
}

async function initiateKhalti(order: PaymentOrder) {
  const secretKey = env.KHALTI_SECRET_KEY;
  if (!secretKey) {
    return fail("Khalti is not configured on this server", 503);
  }

  const endpoints = KHALTI_ENDPOINTS[env.KHALTI_ENV ?? "sandbox"];
  const shipping = order.shippingInfo as ShippingInfo;
  const customerInfo: Record<string, string> = {
    name: shipping.fullName,
    phone: shipping.phone,
  };
  if (shipping.email) {
    customerInfo.email = shipping.email;
  }

  const response = await fetch(endpoints.initiate, {
    method: "POST",
    headers: {
      Authorization: `Key ${secretKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      return_url: `${appBaseUrl()}/checkout/pay/${order.id}`,
      website_url: appBaseUrl(),
      amount: Math.round(order.totalAmount.toNumber() * 100),
      purchase_order_id: order.id,
      purchase_order_name:
        order.items[0]?.productName ?? `Order ${order.id.slice(-8)}`,
      customer_info: customerInfo,
    }),
  });

  if (!response.ok) {
    console.error(
      "Khalti initiation failed:",
      response.status,
      await response.text().catch(() => "")
    );
    return fail("Khalti could not start this payment", 502);
  }

  const result = (await response.json()) as { payment_url?: unknown };
  if (typeof result.payment_url !== "string") {
    return fail("Khalti did not return a payment URL", 502);
  }

  return Response.json({
    status: "success",
    khaltiPaymentUrl: result.payment_url,
  });
}

async function completeOrderPayment(
  ctx: CheckoutContext,
  order: PaymentOrder,
  data: { paymentRef: string; khaltiPidx?: string }
) {
  const completed = await ctx.db.order.updateMany({
    where: { id: order.id, status: "PENDING", paidAt: null },
    data: { status: "PAID", paidAt: new Date(), ...data },
  });
  if (completed.count === 0) {
    const fresh = await ctx.db.order.findUnique({
      where: { id: order.id },
      select: { status: true },
    });
    if (fresh?.status === "PAID") {
      return alreadyProcessed();
    }
    return fail("This order can no longer be paid", 400);
  }
  return confirmed();
}

function decodeEsewaPayload(data: string) {
  try {
    return JSON.parse(Buffer.from(data, "base64").toString("utf-8")) as {
      status?: string;
      transaction_uuid?: string;
      total_amount?: string | number;
      ref_id?: string;
    };
  } catch {
    return null;
  }
}

async function verifyEsewa(
  ctx: CheckoutContext,
  order: PaymentOrder,
  url: URL
) {
  const data = url.searchParams.get("data");
  if (!data) {
    return fail("Missing payment details", 400);
  }

  const decoded = decodeEsewaPayload(data);
  if (!decoded) {
    return fail("Invalid eSewa payload", 400);
  }
  if (decoded.status !== "COMPLETE") {
    return Response.json({ status: "pending" });
  }

  const transactionUuid = decoded.transaction_uuid;
  if (
    !order.esewaTransactionUuid ||
    transactionUuid !== order.esewaTransactionUuid
  ) {
    return fail("Payment transaction does not match this order", 400);
  }

  const reused = await ctx.db.order.findFirst({
    where: { esewaTransactionUuid: transactionUuid, id: { not: order.id } },
    select: { id: true },
  });
  if (reused) {
    return fail("Transaction already used for another payment", 400);
  }

  const expectedAmount = order.totalAmount.toNumber();
  if (Number(decoded.total_amount) !== expectedAmount) {
    return fail("Payment amount mismatch", 400);
  }

  const merchantCode = env.ESEWA_MERCHANT_CODE;
  if (!merchantCode) {
    return fail("eSewa is not configured on this server", 503);
  }

  const endpoints = ESEWA_ENDPOINTS[env.ESEWA_ENV ?? "sandbox"];
  const statusUrl = `${endpoints.status}?product_code=${encodeURIComponent(merchantCode)}&total_amount=${encodeURIComponent(expectedAmount.toFixed(2))}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;

  let verification: {
    status?: string;
    transaction_uuid?: string;
    total_amount?: string | number;
  };
  try {
    const gatewayResponse = await fetch(statusUrl, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!gatewayResponse.ok) {
      return fail("Payment verification failed with eSewa", 400);
    }
    verification = await gatewayResponse.json();
  } catch (gatewayError) {
    console.error("eSewa verification error:", gatewayError);
    return fail("Could not reach eSewa to verify this payment", 500);
  }

  if (
    verification.status !== "COMPLETE" ||
    verification.transaction_uuid !== transactionUuid
  ) {
    return fail("Payment verification failed - transaction not confirmed", 400);
  }
  if (Number(verification.total_amount) !== expectedAmount) {
    return fail("Payment amount mismatch", 400);
  }

  return completeOrderPayment(ctx, order, {
    paymentRef: decoded.ref_id ?? transactionUuid,
  });
}

async function verifyKhalti(
  ctx: CheckoutContext,
  order: PaymentOrder,
  url: URL
) {
  const khaltiTransaction =
    url.searchParams.get("pidx") ?? url.searchParams.get("txnid");
  if (!khaltiTransaction) {
    return fail("Missing payment details", 400);
  }

  const purchaseOrderId = url.searchParams.get("purchase_order_id");
  if (purchaseOrderId && purchaseOrderId !== order.id) {
    return fail("Payment does not match this order", 400);
  }

  const secretKey = env.KHALTI_SECRET_KEY;
  if (!secretKey) {
    return fail("Khalti is not configured on this server", 503);
  }

  const endpoints = KHALTI_ENDPOINTS[env.KHALTI_ENV ?? "sandbox"];
  let lookup: {
    status?: string;
    total_amount?: number;
    purchase_order_id?: string;
    state?: { name?: string };
  };
  try {
    const lookupResponse = await fetch(endpoints.lookup, {
      method: "POST",
      headers: {
        Authorization: `Key ${secretKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ pidx: khaltiTransaction }),
    });
    if (!lookupResponse.ok) {
      return fail("Payment verification failed with Khalti", 400);
    }
    lookup = await lookupResponse.json();
  } catch (lookupError) {
    console.error("Khalti verification error:", lookupError);
    return fail("Could not reach Khalti to verify this payment", 500);
  }

  if (lookup.purchase_order_id && lookup.purchase_order_id !== order.id) {
    return fail("Payment verification failed - order mismatch", 400);
  }

  const expectedAmount = order.totalAmount.toNumber();
  if (
    lookup.total_amount !== undefined &&
    Math.abs(lookup.total_amount / 100 - expectedAmount) > 0.01
  ) {
    return fail("Payment amount mismatch", 400);
  }
  if (lookup.status !== "Completed" && lookup.state?.name !== "Completed") {
    return fail("Payment not completed", 400);
  }

  const reused = await ctx.db.order.findFirst({
    where: { khaltiPidx: khaltiTransaction, id: { not: order.id } },
    select: { id: true },
  });
  if (reused) {
    return fail("Transaction already used for another payment", 400);
  }

  return completeOrderPayment(ctx, order, {
    paymentRef: khaltiTransaction,
    khaltiPidx: khaltiTransaction,
  });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("Missing required fields", 400);
  }

  const parsed = initiateSchema.safeParse(payload);
  if (!parsed.success) {
    return fail("Missing required fields", 400);
  }

  try {
    const { ctx, order } = await loadOrder(request, parsed.data.orderId);
    if (!order) {
      return fail("Order not found", 404);
    }
    if (order.userId && order.userId !== ctx.session?.user?.id) {
      return fail("This order belongs to another account", 403);
    }
    if (order.paymentMethod === "COD") {
      return fail("This order is paid on delivery", 400);
    }
    if (order.status === "PAID") {
      return fail("This order is already paid", 400);
    }
    if (order.status !== "PENDING") {
      return fail("This order can no longer be paid", 400);
    }
    if (order.paymentMethod === "ESEWA") {
      return initiateEsewa(ctx, order);
    }
    return initiateKhalti(order);
  } catch (error) {
    console.error("Payment initiation error:", error);
    return fail("Error creating payment session", 500);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = initiateSchema.safeParse({
    orderId: url.searchParams.get("orderId"),
  });
  if (!parsed.success) {
    return fail("Missing required fields", 400);
  }

  try {
    const { ctx, order } = await loadOrder(request, parsed.data.orderId);
    if (!order) {
      return fail("Order not found", 404);
    }
    // no session check: completion is proven by the gateway receipt bound to
    // this order, so the return works for guest and signed-in users alike
    if (order.paymentMethod === "COD") {
      return fail("This order is paid on delivery", 400);
    }
    if (order.status === "PAID") {
      return alreadyProcessed();
    }
    if (order.status !== "PENDING") {
      return fail("This order can no longer be paid", 400);
    }
    if (order.paymentMethod === "ESEWA") {
      return verifyEsewa(ctx, order, url);
    }
    return verifyKhalti(ctx, order, url);
  } catch (error) {
    console.error("Payment verification error:", error);
    return fail("Payment verification failed", 500);
  }
}
