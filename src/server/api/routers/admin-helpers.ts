import { TRPCError } from "@trpc/server";
import type { db } from "@/lib/prisma";

export function isP2002(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  return (error as { code?: unknown }).code === "P2002";
}

export function enforceUniqueSlug(error: unknown, label: string): never {
  if (isP2002(error)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `A ${label} with this slug already exists.`,
    });
  }
  throw error;
}

export function enforceUniqueField(error: unknown): never {
  if (isP2002(error)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This slug or one of these SKU codes is already taken.",
    });
  }
  throw error;
}

/** Prisma transaction client type, inferred from `db.$transaction`. */
export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export const optionKey = (option: string, value: string) =>
  `${option.toLowerCase()}\u0000${value.toLowerCase()}`;

export async function createVariants(
  tx: Tx,
  productId: string,
  input: {
    options: Array<{ name: string; values: string[] }>;
    skus: Array<{
      code: string;
      price: number;
      originalPrice?: number | null;
      stock: number;
      imageUrl?: string;
      optionValues: Array<{ option: string; value: string }>;
    }>;
  },
  baseImage: string
) {
  const valueIdsByKey = new Map<string, string>();

  const optionsWithIds = await Promise.all(
    input.options.map(async (option) => {
      const created = await tx.productOption.create({
        data: { productId, name: option.name },
      });
      return { option, id: created.id };
    })
  );

  await Promise.all(
    optionsWithIds.flatMap(({ option, id }) =>
      option.values.map(async (value) => {
        const created = await tx.productOptionValue.create({
          data: { optionId: id, value },
        });
        valueIdsByKey.set(optionKey(option.name, value), created.id);
      })
    )
  );

  await Promise.all(
    input.skus.map(async (sku) => {
      const valueIds: string[] = [];
      for (const pair of sku.optionValues) {
        const id = valueIdsByKey.get(optionKey(pair.option, pair.value));
        if (!id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Variant "${pair.option}: ${pair.value}" is not defined.`,
          });
        }
        valueIds.push(id);
      }
      await tx.productSKU.create({
        data: {
          productId,
          sku: sku.code,
          price: sku.price,
          originalPrice: sku.originalPrice ?? sku.price,
          stock: sku.stock,
          imageUrl: sku.imageUrl || baseImage,
          optionValues: { connect: valueIds.map((id) => ({ id })) },
        },
      });
    })
  );
}

export async function assertNoConflicts(
  ctxDb: typeof db,
  opts: {
    slug?: string;
    codes: string[];
    exceptProductId?: string;
  }
) {
  if (opts.slug) {
    const slugConflict = await ctxDb.product.findUnique({
      where: { slug: opts.slug },
      select: { id: true },
    });
    if (slugConflict && slugConflict.id !== opts.exceptProductId) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A product with this slug already exists.",
      });
    }
  }
  if (opts.codes.length > 0) {
    const skuConflict = await ctxDb.productSKU.findFirst({
      where: {
        sku: { in: opts.codes },
        ...(opts.exceptProductId
          ? { productId: { not: opts.exceptProductId } }
          : {}),
      },
      select: { sku: true },
    });
    if (skuConflict) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `SKU code "${skuConflict.sku}" is already in use.`,
      });
    }
  }
}

/** Rejects a SKU code that is already used by any product other than `exceptSkuId`. */
export async function assertSkuCodeFree(
  ctxDb: typeof db,
  code: string,
  exceptSkuId?: string
) {
  const conflict = await ctxDb.productSKU.findFirst({
    where: { sku: code, ...(exceptSkuId ? { NOT: { id: exceptSkuId } } : {}) },
    select: { sku: true },
  });
  if (conflict) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `SKU code "${code}" is already in use.`,
    });
  }
}

export function serializeDecimal(
  value: unknown,
  fallback: number | null = null
) {
  if (value === null || value === undefined) {
    return fallback;
  }
  return Number(value);
}
