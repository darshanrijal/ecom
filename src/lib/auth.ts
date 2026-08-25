import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./prisma";
import { resend } from "./resend";
import { env } from "@/config/env";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ url, user }) => {
      await resend.emails.send({
        to: user.email,
        from: "emails@darshanrijal.com.np",
        subject: "Verify your email address",
        text: `Click here to verify your email address : ${url}`,
      });
    },
    sendOnSignUp: true,
  },
  advanced: {
    cookiePrefix: "GadaElectronics",
  },
});

export const getCurrentSession = cache(async () => {
  const data = await auth.api.getSession({
    headers: await headers(),
  });
  if (!data) {
    return { session: null, user: null };
  }
  return {
    session: data.session,
    user: data.user,
  };
});

export const preventUnauthorized = cache(async () => {
  const { user, session } = await getCurrentSession();
  if (user && !user.emailVerified) {
    redirect("/verify-email");
  }
  return { user, session };
});
