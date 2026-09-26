// biome-ignore-all lint: just an admin helper script

/**
 * Promote (or demote) a user to ADMIN by email.
 *
 * Usage:
 *   bun scripts/make-admin.ts you@example.com
 *   bun scripts/make-admin.ts you@example.com --demote
 */

import { db } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";

const email = process.argv[2];
const demote = process.argv.includes("--demote");

if (!email) {
  console.error("Usage: bun scripts/make-admin.ts <email> [--demote]");
  process.exit(1);
}

const user = await db.user.findUnique({ where: { email } });
if (!user) {
  console.error(`No user found with email "${email}".`);
  process.exit(1);
}

const updated = await db.user.update({
  where: { email },
  data: { role: demote ? Role.CUSTOMER : Role.ADMIN },
});

console.log(
  `"${updated.email}" is now ${updated.role === "ADMIN" ? "an ADMIN" : "a CUSTOMER"}.`
);
process.exit(0);
