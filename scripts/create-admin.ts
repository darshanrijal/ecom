// biome-ignore-all lint: just an admin helper script

/**
 * Create a ready-to-use ADMIN account (or promote an existing one).
 *
 * Uses better-auth's own scrypt hashing so the stored password can be
 * verified by the app's sign-in flow — it never stores a plaintext password.
 *
 *   bun scripts/create-admin.ts                # defaults: admin@gada.com / Admin@1234!
 *   bun scripts/create-admin.ts you@x.com pass # custom credentials
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... bun scripts/create-admin.ts
 *
 * Idempotent: if the email already exists it is promoted to ADMIN (password
 * is left untouched unless --reset-password is passed).
 */

import { randomUUID } from "node:crypto";
import { db } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { hashPassword } from "better-auth/crypto";

const email = process.env.ADMIN_EMAIL ?? process.argv[2] ?? "admin@gada.com";
const password = process.env.ADMIN_PASSWORD ?? process.argv[3] ?? "Admin@1234!";
const resetPassword = process.argv.includes("--reset-password");
const name = process.env.ADMIN_NAME ?? "Store Admin";

if (password.length < 8) {
  console.error("Admin password must be at least 8 characters.");
  process.exit(1);
}

const existing = await db.user.findUnique({ where: { email } });

if (!existing) {
  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        id: randomUUID().replaceAll("-", ""),
        name,
        email,
        emailVerified: true,
        role: Role.ADMIN,
      },
    });
    await tx.account.create({
      data: {
        id: randomUUID().replaceAll("-", ""),
        userId: created.id,
        providerId: "credential",
        accountId: created.id,
        password: await hashPassword(password),
      },
    });
    return created;
  });
  console.log(`Admin "${email}" created with role ADMIN.`);
  console.log(
    `  Sign in at ${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/sign-in`
  );
  console.log(`    email:    ${email}`);
  console.log(`    password: ${password}`);
  console.log("Change this password after first sign-in.");
  process.exit(0);
}

if (resetPassword) {
  await db.account.updateMany({
    where: { userId: existing.id, providerId: "credential" },
    data: { password: await hashPassword(password) },
  });
  console.log(`Password for "${email}" was reset.`);
}

if (existing.role !== Role.ADMIN) {
  await db.user.update({ where: { email }, data: { role: Role.ADMIN } });
  console.log(`"${email}" was promoted to ADMIN.`);
} else {
  console.log(`"${email}" is already an ADMIN.`);
}

console.log(
  `  Sign in at ${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/sign-in`
);
console.log(`    email:    ${email}`);
console.log(
  `    password: ${password}${resetPassword ? " (updated)" : " (existing — leaves it as-is unless --reset-password)"}`
);
process.exit(0);
