import { createId } from "@paralleldrive/cuid2";
import { env } from "@/config/env";
import { z } from "zod";

const API_BASE_URLS = {
  sandbox: "https://dev.khalti.com/api/v2/",
  production: "https://khalti.com/api/v2/",
} as const;

export interface KhaltiConfig {
  secretKey: string;
  publicKey: string;
  environment: "sandbox" | "production";
  apiBaseUrl: string;
}

export function khaltiConfig(): KhaltiConfig {
  return {
    secretKey: env.KHALTI_SECRET_KEY,
    publicKey: env.KHALTI_PUBLIC_KEY,
    environment: env.KHALTI_ENV,
    apiBaseUrl: API_BASE_URLS[env.KHALTI_ENV],
  };
}

export function amountToPaisa(amountNpr: number) {
  return Math.round(amountNpr * 100);
}

/** Fresh, unique purchase_order_id for a Khalti payment attempt. */
export function newPurchaseOrderId() {
  return `GA-${createId()}-${Date.now().toString(36)}`;
}

export interface KhaltiInitiateOptions {
  purchaseOrderId: string;
  purchaseOrderName: string;
  amountNpr: number;
  returnUrl: string;
  websiteUrl: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

const khaltiInitiateSchema = z.object({
  pidx: z.string(),
  payment_url: z.string(),
  expires_at: z.string(),
  expires_in: z.number(),
});

export interface KhaltiInitiateResult {
  pidx: string;
  paymentUrl: string;
  expiresAt: string;
  expiresIn: number;
}

/** Start a Khalti KPG-2 payment. Returns the payment portal URL to redirect to. */
export async function initiateKhaltiPayment(
  options: KhaltiInitiateOptions,
  config: KhaltiConfig = khaltiConfig(),
  fetcher: typeof fetch = fetch
): Promise<KhaltiInitiateResult | null> {
  const response = await fetcher(`${config.apiBaseUrl}epayment/initiate/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${config.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      return_url: options.returnUrl,
      website_url: options.websiteUrl,
      amount: amountToPaisa(options.amountNpr),
      purchase_order_id: options.purchaseOrderId,
      purchase_order_name: options.purchaseOrderName,
      customer_info: options.customerInfo,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  try {
    const parsed = khaltiInitiateSchema.parse(await response.json());
    return {
      pidx: parsed.pidx,
      paymentUrl: parsed.payment_url,
      expiresAt: parsed.expires_at,
      expiresIn: parsed.expires_in,
    };
  } catch {
    return null;
  }
}

export const khaltiLookupSchema = z.object({
  pidx: z.string(),
  total_amount: z.number(),
  status: z.string(),
  transaction_id: z.string().nullable(),
  fee: z.number(),
  refunded: z.boolean(),
});

export type KhaltiLookup = z.infer<typeof khaltiLookupSchema>;

export function isKhaltiSuccess(status: string) {
  return status === "Completed";
}

/** Query Khalti's server-to-server lookup API (authoritative). */
export async function lookupKhaltiPayment(
  pidx: string,
  config: KhaltiConfig = khaltiConfig(),
  fetcher: typeof fetch = fetch
): Promise<KhaltiLookup | null> {
  const response = await fetcher(`${config.apiBaseUrl}epayment/lookup/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${config.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  try {
    return khaltiLookupSchema.parse(await response.json());
  } catch {
    return null;
  }
}
