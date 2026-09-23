import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    RESEND_API_KEY: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    ESEWA_MERCHANT_CODE: z.string().min(1).default("EPAYTEST"),
    ESEWA_SECRET_KEY: z.string().min(1).default("8gBm/:&EnhH.1/q"),
    ESEWA_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  },
  client: {
    NEXT_PUBLIC_BASE_URL: z.url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  },
  emptyStringAsUndefined: true,
});
