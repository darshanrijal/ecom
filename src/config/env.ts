import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    RESEND_API_KEY: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    UPLOADTHING_TOKEN: z.string(),
    UPLOADTHING_SECRET_KEY: z.string(),
    ADMIN_EMAILS: z.string().optional(),
    ESEWA_MERCHANT_CODE: z.string().optional(),
    ESEWA_SECRET_KEY: z.string().optional(),
    ESEWA_ENV: z.enum(["sandbox", "production"]).optional(),
    KHALTI_SECRET_KEY: z.string().optional(),
    KHALTI_ENV: z.enum(["sandbox", "production"]).optional(),
  },
  client: {
    NEXT_PUBLIC_BASE_URL: z.url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  },
  emptyStringAsUndefined: true,
});
