"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function setPasswordAction(
  newPassword: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await auth.api.setPassword({
      body: { newPassword },
      headers: await headers(),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    };
  }
}
