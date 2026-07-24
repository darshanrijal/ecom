import { env } from "@/config/env";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const dbSingleton = () => new PrismaClient({ adapter });

declare global {
  var __DB_CLIENT__: PrismaClient;
}

export const db = globalThis.__DB_CLIENT__ ?? dbSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.__DB_CLIENT__ = db;
}
