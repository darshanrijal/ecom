import { env } from "@/config/env";

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  const admins = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return admins.includes(email.toLowerCase());
}
