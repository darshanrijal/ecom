import { createHmac } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { env } from "@/config/env";
import { z } from "zod";

const FORM_URLS = {
  sandbox: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
  production: "https://epay.esewa.com.np/api/epay/main/v2/form",
} as const;

const STATUS_URLS = {
  sandbox: "https://rc.esewa.com.np/api/epay/transaction/status/",
  production: "https://esewa.com.np/api/epay/transaction/status/",
} as const;

export interface EsewaConfig {
  productCode: string;
  secretKey: string;
  environment: "sandbox" | "production";
  formUrl: string;
  statusUrl: string;
}

export function esewaConfig(): EsewaConfig {
  return {
    productCode: env.ESEWA_MERCHANT_CODE,
    secretKey: env.ESEWA_SECRET_KEY,
    environment: env.ESEWA_ENV,
    formUrl: FORM_URLS[env.ESEWA_ENV],
    statusUrl: STATUS_URLS[env.ESEWA_ENV],
  };
}

const SIGNED_FIELD_NAMES = "total_amount,transaction_uuid,product_code";

export function buildSignatureMessage(fields: {
  totalAmount: string;
  transactionUuid: string;
  productCode: string;
}) {
  return `total_amount=${fields.totalAmount},transaction_uuid=${fields.transactionUuid},product_code=${fields.productCode}`;
}

function signMessage(message: string, secretKey: string) {
  return createHmac("sha256", secretKey).update(message).digest("base64");
}

export interface EsewaInitForm {
  url: string;
  fields: Record<string, string>;
}

export interface EsewaInitOptions {
  amount: number;
  transactionUuid: string;
  successUrl: string;
  failureUrl: string;
}

export function buildEsewaInitForm(
  options: EsewaInitOptions,
  config: EsewaConfig = esewaConfig()
): EsewaInitForm {
  const totalAmount = options.amount.toFixed(2);

  const fields: Record<string, string> = {
    amount: totalAmount,
    tax_amount: "0.00",
    total_amount: totalAmount,
    transaction_uuid: options.transactionUuid,
    product_code: config.productCode,
    product_service_charge: "0.00",
    product_delivery_charge: "0.00",
    success_url: options.successUrl,
    failure_url: options.failureUrl,
    signed_field_names: SIGNED_FIELD_NAMES,
    signature: signMessage(
      buildSignatureMessage({
        totalAmount,
        transactionUuid: options.transactionUuid,
        productCode: config.productCode,
      }),
      config.secretKey
    ),
  };

  return { url: config.formUrl, fields };
}

/** Generate a fresh transaction_uuid. Only [A-Za-z0-9-] is allowed by eSewa. */
export function newTransactionUuid() {
  return `${createId()}-${Date.now().toString(36)}`;
}

const esewaCallbackSchema = z.object({
  transaction_code: z.string(),
  status: z.string(),
  total_amount: z.union([z.string(), z.number()]),
  transaction_uuid: z.string(),
  product_code: z.string(),
  signed_field_names: z.string(),
  signature: z.string(),
});

export type EsewaCallback = z.infer<typeof esewaCallbackSchema>;

/** Decode + validate the Base64 response body eSewa sends on success/failure. */
export function decodeEsewaCallback(data: string): EsewaCallback {
  const decoded = Buffer.from(data, "base64").toString("utf8");
  return esewaCallbackSchema.parse(JSON.parse(decoded));
}

/**
 * Verify the HMAC signature on eSewa's callback, rebuilt from the
 * signed_field_names it echoes back. Handle the float/string total_amount
 * formatting mismatch eSewa introduces (1000.0 -> 1000).
 */
export function verifyCallbackSignature(
  callback: EsewaCallback,
  config: EsewaConfig = esewaConfig()
) {
  const fields = callback.signed_field_names.split(",");

  const message = fields
    .map((field) => {
      if (field === "signed_field_names") {
        return `${field}=${callback.signed_field_names}`;
      }
      const value =
        field === "total_amount"
          ? formatAmount(callback.total_amount)
          : (callback as Record<string, unknown>)[field];
      return `${field}=${value}`;
    })
    .join(",");

  const expected = signMessage(message, config.secretKey);
  return expected === callback.signature;
}

function formatAmount(value: string | number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) ? number.toFixed(1) : String(number);
}

export const esewaStatusSchema = z.object({
  product_code: z.string(),
  transaction_uuid: z.string(),
  total_amount: z.union([z.string(), z.number()]),
  status: z.string(),
  ref_id: z.string().nullable(),
});

export type EsewaStatus = z.infer<typeof esewaStatusSchema>;

export function isEsewaSuccess(status: string) {
  return status === "COMPLETE";
}

/** Query eSewa's server-to-server status-check API (authoritative). */
export async function checkTransactionStatus(params: {
  transactionUuid: string;
  totalAmount: number;
  config?: EsewaConfig;
}): Promise<EsewaStatus | null> {
  const config = params.config ?? esewaConfig();
  const url = new URL(config.statusUrl);
  url.searchParams.set("product_code", config.productCode);
  url.searchParams.set("transaction_uuid", params.transactionUuid);
  url.searchParams.set("total_amount", params.totalAmount.toFixed(2));

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  try {
    return esewaStatusSchema.parse(await response.json());
  } catch {
    return null;
  }
}
