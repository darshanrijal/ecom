import { TRPCError } from "@trpc/server";
import { slugify } from "@/lib/catalog";
import type { db } from "@/lib/prisma";
import { adminProcedure, router } from "../trpc";
import {
  byIdSchema,
  categoryInputSchema,
  categoryListSchema,
  categoryUpdateSchema,
  productCreateSchema,
  productListSchema,
  productUpdateSchema,
} from "@/lib/admin-schema";
import { disposeOrphanedUploads } from "@/lib/uploads";

function isP2002(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  return (error as { code?: unknown }).code === "P2002";
}

function enforceUniqueSlug(error: unknown, label: string): never {
  if (isP2002(error)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `A ${label} with this slug already exists.`,
    });
  }
  throw error;
}

function enforceUniqueField(error: unknown): never {
  if (isP2002(error)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This slug or one of these SKU codes is already taken.",
    });
  }
  throw error;
}

/** Prisma transaction client type, inferred from `db.$transaction`. */
type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

const optionKey = (option: string, value: string) =>
  `${option.toLowerCase()}\u0000${value.toLowerCase()}`;

async function createVariants(
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

async function assertNoConflicts(
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

function serializeDecimal(value: unknown, fallback: number | null = null) {
  if (value === null || value === undefined) {
    return fallback;
  }
  return Number(value);
}

const productRowSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  categoryId: true,
  baseImage: true,
  isPublished: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  productSKUs: {
    orderBy: { price: "asc" as const },
    select: {
      id: true,
      sku: true,
      price: true,
      originalPrice: true,
      stock: true,
      imageUrl: true,
    },
  },
} as const;

function toProductRow(product: {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  baseImage: string;
  isPublished: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string };
  productSKUs: Array<{
    id: string;
    sku: string;
    price: unknown;
    originalPrice: unknown;
    stock: number;
    imageUrl: string;
  }>;
}) {
  const skus = product.productSKUs;
  const primary = skus[0] ?? null;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.categoryId,
    category: product.category,
    baseImage: product.baseImage,
    isPublished: product.isPublished,
    status: product.isPublished ? ("Published" as const) : ("Draft" as const),
    archivedAt: product.archivedAt,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    skuCount: skus.length,
    primarySku: primary ? primary.sku : null,
    productSKUs: skus.map((sku) => ({
      sku: sku.sku,
      price: serializeDecimal(sku.price) ?? 0,
      originalPrice: sku.originalPrice
        ? serializeDecimal(sku.originalPrice)
        : null,
      stock: sku.stock,
    })),
    price: serializeDecimal(primary?.price) ?? 0,
    originalPrice: primary ? serializeDecimal(primary.originalPrice) : null,
    stock: skus.reduce((sum, sku) => sum + sku.stock, 0),
  };
}

export const adminRouter = router({
  categories: router({
    list: adminProcedure
      .input(categoryListSchema)
      .query(async ({ ctx, input }) => {
        const categories = await ctx.db.category.findMany({
          where: input.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" } },
                  { slug: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : undefined,
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            createdAt: true,
            _count: { select: { products: true } },
          },
        });
        return categories.map(({ _count, ...category }) => ({
          ...category,
          productCount: _count.products,
        }));
      }),

    create: adminProcedure
      .input(categoryInputSchema)
      .mutation(async ({ ctx, input }) => {
        const slug = slugify(input.slug || input.name);
        try {
          const created = await ctx.db.category.create({
            data: {
              name: input.name,
              slug,
              description: input.description ?? null,
            },
          });
          return created;
        } catch (error) {
          enforceUniqueSlug(error, "category");
        }
      }),

    update: adminProcedure
      .input(categoryUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, name, slug, description } = input;
        try {
          const updated = await ctx.db.category.update({
            where: { id },
            data: {
              ...(name === undefined ? {} : { name }),
              ...(slug === undefined ? {} : { slug: slugify(slug) }),
              ...(description === undefined ? {} : { description }),
            },
          });
          return updated;
        } catch (error) {
          enforceUniqueSlug(error, "category");
        }
      }),

    delete: adminProcedure
      .input(byIdSchema)
      .mutation(async ({ ctx, input }) => {
        const category = await ctx.db.category.findUnique({
          where: { id: input.id },
          select: { _count: { select: { products: true } } },
        });
        if (!category) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (category._count.products > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Cannot delete: this category still has ${category._count.products} product(s). Archive them, then permanently delete them from the archived view.`,
          });
        }
        await ctx.db.category.delete({ where: { id: input.id } });
      }),
  }),

  products: router({
    list: adminProcedure
      .input(productListSchema)
      .query(async ({ ctx, input }) => {
        const { limit, cursor } = input;
        const products = await ctx.db.product.findMany({
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          skip: cursor ? 1 : 0,
          orderBy: { id: "asc" },
          where: {
            archivedAt: input.showArchived ? { not: null } : null,
            ...(input.categoryId ? { categoryId: input.categoryId } : {}),
            ...(input.status
              ? { isPublished: input.status === "Published" }
              : {}),
            ...(input.search
              ? {
                  OR: [
                    {
                      name: {
                        contains: input.search,
                        mode: "insensitive",
                      },
                    },
                    {
                      productSKUs: {
                        some: {
                          sku: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                      },
                    },
                  ],
                }
              : {}),
          },
          select: productRowSelect,
        });

        let nextCursor: string | null = null;
        if (products.length > limit) {
          const extra = products.pop();
          nextCursor = extra?.id ?? null;
        }

        return {
          items: products.map(toProductRow),
          nextCursor,
        };
      }),

    get: adminProcedure.input(byIdSchema).query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.id },
        include: {
          category: { select: { id: true, name: true } },
          options: {
            include: {
              values: { select: { id: true, value: true } },
            },
          },
          productSKUs: {
            orderBy: { price: "asc" },
            include: {
              optionValues: {
                select: { id: true, optionId: true, value: true },
              },
            },
          },
        },
      });
      if (!product) {
        return null;
      }
      return {
        ...product,
        category: product.category,
        productSKUs: product.productSKUs.map((sku) => ({
          ...sku,
          price: Number(sku.price),
          originalPrice: sku.originalPrice ? Number(sku.originalPrice) : null,
        })),
      };
    }),

    create: adminProcedure
      .input(productCreateSchema)
      .mutation(async ({ ctx, input }) => {
        const slug = slugify(input.slug || input.name);
        const baseImage = input.baseImage || "";
        assertNoConflicts(ctx.db, {
          slug,
          codes: input.skus.map((s) => s.code),
        });
        try {
          const product = await ctx.db.$transaction(async (tx) => {
            const created = await tx.product.create({
              data: {
                name: input.name,
                slug,
                description: input.description,
                categoryId: input.categoryId,
                baseImage,
                isPublished: input.isPublished,
              },
            });
            await createVariants(tx, created.id, input, baseImage);
            return created;
          });
          return product.id;
        } catch (error) {
          enforceUniqueField(error);
        }
      }),

    update: adminProcedure
      .input(productUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const { id } = input;
        const slug = input.slug ? slugify(input.slug) : undefined;
        const baseImage = input.baseImage || "";
        const existing = await ctx.db.product.findUnique({
          where: { id },
          select: {
            baseImage: true,
            productSKUs: { select: { imageUrl: true } },
          },
        });
        assertNoConflicts(ctx.db, {
          slug: slug ?? undefined,
          exceptProductId: id,
          codes: input.skus.map((s) => s.code),
        });
        try {
          await ctx.db.$transaction(async (tx) => {
            await tx.productSKU.deleteMany({ where: { productId: id } });
            await tx.productOption.deleteMany({ where: { productId: id } });
            await tx.product.update({
              where: { id },
              data: {
                name: input.name,
                ...(slug === undefined ? {} : { slug }),
                description: input.description,
                categoryId: input.categoryId,
                baseImage,
                isPublished: input.isPublished,
              },
            });
            await createVariants(tx, id, input, baseImage);
          });
          await disposeOrphanedUploads(
            [
              existing?.baseImage,
              ...(existing?.productSKUs.map((sku) => sku.imageUrl) ?? []),
            ],
            [baseImage, ...input.skus.map((sku) => sku.imageUrl || baseImage)]
          );
          return id;
        } catch (error) {
          enforceUniqueField(error);
        }
      }),

    archive: adminProcedure
      .input(byIdSchema)
      .mutation(async ({ ctx, input }) => {
        await ctx.db.product.update({
          where: { id: input.id },
          data: { archivedAt: new Date(), isPublished: false },
        });
      }),

    restore: adminProcedure
      .input(byIdSchema)
      .mutation(async ({ ctx, input }) => {
        await ctx.db.product.update({
          where: { id: input.id },
          data: { archivedAt: null },
        });
      }),

    delete: adminProcedure
      .input(byIdSchema)
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.product.findUnique({
          where: { id: input.id },
          select: {
            baseImage: true,
            productSKUs: { select: { imageUrl: true } },
          },
        });
        try {
          await ctx.db.product.delete({ where: { id: input.id } });
        } catch (error) {
          const isNotFound =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: unknown }).code === "P2025";
          if (!isNotFound) {
            throw error;
          }
          // biome-ignore lint/style/useErrorCause: TRPCError accepts `cause` per its options type
          throw new TRPCError({
            code: "NOT_FOUND",
            cause: error,
          });
        }
        if (existing) {
          await disposeOrphanedUploads(
            [
              existing.baseImage,
              ...existing.productSKUs.map((sku) => sku.imageUrl),
            ],
            []
          );
        }
      }),
  }),
});
