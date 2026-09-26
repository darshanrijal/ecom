import { TRPCError } from "@trpc/server";
import { isAdminEmail } from "@/lib/admin";
import {
  adminCreateCategorySchema,
  adminCreateProductSchema,
  adminCreateSkuSchema,
  adminListOrdersSchema,
  adminListProductsSchema,
  adminProductIdSchema,
  adminSkuIdSchema,
  adminUpdateOrderStatusSchema,
  adminUpdateProductSchema,
  adminUpdateSkuSchema,
  comboKey,
  ORDER_TRANSITIONS,
  RESTOCK_STATUSES,
} from "@/lib/admin-schema";
import {
  cleanupImageIfUnused,
  cleanupImagesIfUnused,
  getStorageUsage,
  sweepUnusedImages,
} from "@/lib/image-cleanup";
import { slugify } from "@/lib/catalog";
import type { ShippingInfo } from "@/lib/order-schema";
import { adminProcedure, protectedProcedure, router } from "../trpc";

/** Prisma unique-constraint violations (e.g. duplicate slug / SKU code). */
function uniqueViolation(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function notFound(what: string) {
  return new TRPCError({ code: "NOT_FOUND", message: `${what} not found` });
}

function badRequest(message: string) {
  return new TRPCError({ code: "BAD_REQUEST", message });
}

/** Runs a write, turning unique-constraint failures into a friendly error. */
async function orUniqueViolation<T>(run: () => Promise<T>, message: string) {
  try {
    return await run();
  } catch (error) {
    if (uniqueViolation(error)) {
      throw badRequest(message);
    }
    throw error;
  }
}

/** Prisma Decimal -> number so responses survive JSON serialization. */
function serializeSku<T extends { price: unknown; originalPrice: unknown }>(
  sku: T
) {
  return {
    ...sku,
    price: Number(sku.price),
    originalPrice: Number(sku.originalPrice),
  };
}

const optionPairKey = (name: string, value: string) =>
  JSON.stringify([name, value]);

/** Product-level options derived from the option values on its SKUs. */
function deriveOptions(
  skus: Array<{ optionValues: Array<{ name: string; value: string }> }>
) {
  const options = new Map<string, Set<string>>();
  for (const sku of skus) {
    for (const entry of sku.optionValues) {
      const values = options.get(entry.name) ?? new Set<string>();
      values.add(entry.value);
      options.set(entry.name, values);
    }
  }
  return [...options];
}

interface OptionWithValues {
  name: string;
  values: Array<{ id: string; value: string }>;
}

interface ChosenSkuValue {
  name: string;
  value: string;
  existingId?: string;
}

interface SkuValueInput {
  optionValueIds: string[];
  newValues: Array<{ name: string; value: string }>;
}

/** Validates ids in `optionValueIds` all belong to the product's options. */
function assertKnownValueIds(options: OptionWithValues[], ids: string[]) {
  const validIds = new Set(
    options.flatMap((option) => option.values.map((value) => value.id))
  );
  for (const id of ids) {
    if (!validIds.has(id)) {
      throw badRequest("One of the selected option values does not exist");
    }
  }
}

/** Validates `newValues` against the product's option names, keyed by name. */
function collectNewValues(
  options: OptionWithValues[],
  newValues: Array<{ name: string; value: string }>
) {
  const collected = new Map<string, string>();
  const optionNames = new Set(options.map((option) => option.name));
  for (const entry of newValues) {
    if (collected.has(entry.name)) {
      throw badRequest(`Duplicate new value for "${entry.name}"`);
    }
    if (!optionNames.has(entry.name)) {
      throw badRequest(`This product has no option named "${entry.name}"`);
    }
    collected.set(entry.name, entry.value);
  }
  return collected;
}

function pickOptionValue(
  option: OptionWithValues,
  picks: OptionWithValues["values"],
  fresh: string | undefined
): ChosenSkuValue {
  if (picks.length === 1) {
    return {
      name: option.name,
      value: picks[0].value,
      existingId: picks[0].id,
    };
  }
  if (fresh === undefined) {
    throw badRequest(`Select or add a value for "${option.name}"`);
  }
  return { name: option.name, value: fresh };
}

/**
 * Works out the option value each option gets for a new SKU: either an
 * existing value id, or a brand-new value the transaction will create.
 */
function resolveChosenValues(
  options: OptionWithValues[],
  skuCount: number,
  input: SkuValueInput
): ChosenSkuValue[] {
  if (options.length === 0) {
    if (input.optionValueIds.length > 0 || input.newValues.length > 0) {
      throw badRequest("This product has no options to select values for");
    }
    if (skuCount > 0) {
      throw badRequest(
        "This product has no options, so it can only have one SKU"
      );
    }
    return [];
  }

  assertKnownValueIds(options, input.optionValueIds);
  const newByName = collectNewValues(options, input.newValues);

  const chosen: ChosenSkuValue[] = [];
  for (const option of options) {
    const picks = option.values.filter((value) =>
      input.optionValueIds.includes(value.id)
    );
    if (picks.length > 1) {
      throw badRequest(`Select only one value for "${option.name}"`);
    }
    const fresh = newByName.get(option.name);
    if (picks.length === 1 && fresh !== undefined) {
      throw badRequest(
        `Pick an existing "${option.name}" value or add a new one — not both`
      );
    }
    chosen.push(pickOptionValue(option, picks, fresh));
  }
  return chosen;
}

export const adminRouter = router({
  /** Lets the account menu decide whether to show the admin link. */
  check: protectedProcedure.query(({ ctx }) => ({
    isAdmin: isAdminEmail(ctx.user.email),
  })),

  stats: adminProcedure.query(async ({ ctx }) => {
    const [
      productCount,
      publishedCount,
      skuCount,
      outOfStockCount,
      customerCount,
      statusGroups,
      revenueAgg,
      storage,
    ] = await Promise.all([
      ctx.db.product.count(),
      ctx.db.product.count({ where: { isPublished: true } }),
      ctx.db.productSKU.count(),
      ctx.db.productSKU.count({ where: { stock: 0 } }),
      ctx.db.user.count(),
      ctx.db.order.groupBy({ by: ["status"], _count: { _all: true } }),
      ctx.db.order.aggregate({
        where: {
          status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
        },
        _sum: { totalAmount: true },
      }),
      getStorageUsage(),
    ]);

    const byStatus: Record<string, number> = {};
    let orderTotal = 0;
    for (const group of statusGroups) {
      byStatus[group.status] = group._count._all;
      orderTotal += group._count._all;
    }

    return {
      products: {
        total: productCount,
        published: publishedCount,
        drafts: productCount - publishedCount,
        skus: skuCount,
        outOfStock: outOfStockCount,
      },
      orders: {
        total: orderTotal,
        byStatus,
        revenue: Number(revenueAgg._sum.totalAmount ?? 0),
      },
      customers: customerCount,
      storage,
    };
  }),

  listProducts: adminProcedure
    .input(adminListProductsSchema)
    .query(async ({ ctx, input }) => {
      const products = await ctx.db.product.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        orderBy: { createdAt: "desc" },
        where: input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: "insensitive" } },
                { slug: { contains: input.search, mode: "insensitive" } },
              ],
            }
          : undefined,
        include: {
          category: { select: { id: true, name: true } },
          productSKUs: { select: { price: true, stock: true } },
          _count: { select: { productSKUs: true } },
        },
      });

      let nextCursor: string | undefined;
      if (products.length > input.limit) {
        nextCursor = products.pop()?.id;
      }

      return {
        products: products.map((product) => {
          const prices = product.productSKUs.map((sku) => Number(sku.price));
          return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            baseImage: product.baseImage,
            isPublished: product.isPublished,
            createdAt: product.createdAt,
            category: product.category,
            skuCount: product._count.productSKUs,
            totalStock: product.productSKUs.reduce(
              (sum, sku) => sum + sku.stock,
              0
            ),
            minPrice: prices.length > 0 ? Math.min(...prices) : null,
          };
        }),
        nextCursor,
      };
    }),

  getProduct: adminProcedure
    .input(adminProductIdSchema)
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        include: {
          category: { select: { id: true, name: true } },
          options: {
            orderBy: { name: "asc" },
            include: { values: { orderBy: { value: "asc" } } },
          },
          productSKUs: {
            orderBy: { createdAt: "asc" },
            include: {
              optionValues: { include: { option: { select: { name: true } } } },
            },
          },
        },
      });

      if (!product) {
        throw notFound("Product");
      }

      return {
        ...product,
        productSKUs: product.productSKUs.map((sku) => ({
          ...serializeSku(sku),
          labels: sku.optionValues.map(
            (value) => `${value.option.name}: ${value.value}`
          ),
        })),
      };
    }),

  createProduct: adminProcedure
    .input(adminCreateProductSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.$transaction(async (tx) => {
          const slugTaken = await tx.product.findUnique({
            where: { slug: input.slug },
            select: { id: true },
          });
          if (slugTaken) {
            throw badRequest("A product with this slug already exists");
          }

          const codes = input.skus.map((sku) => sku.sku);
          if (new Set(codes).size !== codes.length) {
            throw badRequest("Duplicate SKU codes in the same form");
          }
          const existing = await tx.productSKU.findMany({
            where: { sku: { in: codes } },
            select: { sku: true },
          });
          if (existing.length > 0) {
            throw badRequest(
              `SKU code already in use: ${existing
                .map((row) => row.sku)
                .join(", ")}`
            );
          }

          const category = await tx.category.findUnique({
            where: { id: input.categoryId },
            select: { id: true },
          });
          if (!category) {
            throw notFound("Category");
          }

          const product = await tx.product.create({
            data: {
              name: input.name,
              slug: input.slug,
              description: input.description,
              categoryId: input.categoryId,
              baseImage: input.baseImage,
              isPublished: input.isPublished,
              options: {
                create: deriveOptions(input.skus).map(([name, values]) => ({
                  name,
                  values: { create: [...values].map((value) => ({ value })) },
                })),
              },
            },
            include: { options: { include: { values: true } } },
          });

          const valueIds = new Map<string, string>();
          for (const option of product.options) {
            for (const value of option.values) {
              valueIds.set(optionPairKey(option.name, value.value), value.id);
            }
          }

          for (const sku of input.skus) {
            const connect = sku.optionValues.map((entry) => {
              const id = valueIds.get(optionPairKey(entry.name, entry.value));
              if (!id) {
                throw badRequest("Unknown option value");
              }
              return { id };
            });

            // biome-ignore lint/performance/noAwaitInLoops: sequential creates inside one transaction
            await tx.productSKU.create({
              data: {
                productId: product.id,
                sku: sku.sku,
                price: sku.price,
                originalPrice: sku.originalPrice ?? sku.price,
                stock: sku.stock,
                imageUrl: sku.imageUrl ?? product.baseImage,
                optionValues: { connect },
              },
            });
          }

          return {
            id: product.id,
            name: product.name,
            slug: product.slug,
          };
        });
      } catch (error) {
        if (uniqueViolation(error)) {
          throw badRequest("A product or SKU with that identifier exists");
        }
        throw error;
      }
    }),

  updateProduct: adminProcedure
    .input(adminUpdateProductSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.product.findUnique({
        where: { id: input.productId },
        select: { id: true, slug: true, baseImage: true },
      });
      if (!existing) {
        throw notFound("Product");
      }

      if (input.slug !== existing.slug) {
        const slugTaken = await ctx.db.product.findUnique({
          where: { slug: input.slug },
          select: { id: true },
        });
        if (slugTaken) {
          throw badRequest("A product with this slug already exists");
        }
      }

      const category = await ctx.db.category.findUnique({
        where: { id: input.categoryId },
        select: { id: true },
      });
      if (!category) {
        throw notFound("Category");
      }

      const updated = await orUniqueViolation(
        () =>
          ctx.db.product.update({
            where: { id: input.productId },
            data: {
              name: input.name,
              slug: input.slug,
              description: input.description,
              categoryId: input.categoryId,
              baseImage: input.baseImage,
              isPublished: input.isPublished,
            },
            select: { id: true, name: true, slug: true, isPublished: true },
          }),
        "A product with this slug already exists"
      );

      if (existing.baseImage !== input.baseImage) {
        await cleanupImageIfUnused(existing.baseImage);
      }

      return updated;
    }),

  togglePublish: adminProcedure
    .input(adminProductIdSchema)
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        select: { id: true, isPublished: true },
      });
      if (!product) {
        throw notFound("Product");
      }

      return await ctx.db.product.update({
        where: { id: product.id },
        data: { isPublished: !product.isPublished },
        select: { id: true, isPublished: true },
      });
    }),

  deleteProduct: adminProcedure
    .input(adminProductIdSchema)
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        include: { productSKUs: { select: { imageUrl: true } } },
      });
      if (!product) {
        throw notFound("Product");
      }

      await ctx.db.product.delete({ where: { id: product.id } });
      await cleanupImagesIfUnused([
        product.baseImage,
        ...product.productSKUs.map((sku) => sku.imageUrl),
      ]);

      return { id: product.id };
    }),

  createSku: adminProcedure
    .input(adminCreateSkuSchema)
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        include: {
          options: { include: { values: true } },
          productSKUs: {
            include: {
              optionValues: { include: { option: { select: { name: true } } } },
            },
          },
        },
      });
      if (!product) {
        throw notFound("Product");
      }

      const chosen = resolveChosenValues(
        product.options,
        product.productSKUs.length,
        input
      );

      const wantedCombo = comboKey(chosen);
      const duplicateCombo = product.productSKUs.some(
        (sku) =>
          comboKey(
            sku.optionValues.map((entry) => ({
              name: entry.option.name,
              value: entry.value,
            }))
          ) === wantedCombo
      );
      if (duplicateCombo) {
        throw badRequest("A SKU with this option combination already exists");
      }

      const codeTaken = await ctx.db.productSKU.findUnique({
        where: { sku: input.sku },
        select: { id: true },
      });
      if (codeTaken) {
        throw badRequest(`SKU code "${input.sku}" is already in use`);
      }

      try {
        const sku = await ctx.db.$transaction(async (tx) => {
          const connect: Array<{ id: string }> = [];

          for (const entry of chosen) {
            if (entry.existingId) {
              connect.push({ id: entry.existingId });
              continue;
            }

            const option = product.options.find(
              (candidate) => candidate.name === entry.name
            );
            if (!option) {
              throw badRequest(
                `This product has no option named "${entry.name}"`
              );
            }

            const reused = option.values.find(
              (value) => value.value === entry.value
            );
            if (reused) {
              connect.push({ id: reused.id });
              continue;
            }

            // biome-ignore lint/performance/noAwaitInLoops: sequential creates inside one transaction
            const created = await tx.productOptionValue.create({
              data: { optionId: option.id, value: entry.value },
            });
            connect.push({ id: created.id });
          }

          return await tx.productSKU.create({
            data: {
              productId: product.id,
              sku: input.sku,
              price: input.price,
              originalPrice: input.originalPrice ?? input.price,
              stock: input.stock,
              imageUrl: input.imageUrl ?? product.baseImage,
              optionValues: { connect },
            },
            include: {
              optionValues: {
                include: { option: { select: { name: true } } },
              },
            },
          });
        });

        return {
          ...serializeSku(sku),
          labels: sku.optionValues.map(
            (entry) => `${entry.option.name}: ${entry.value}`
          ),
        };
      } catch (error) {
        if (uniqueViolation(error)) {
          throw badRequest("That SKU code is already in use");
        }
        throw error;
      }
    }),

  updateSku: adminProcedure
    .input(adminUpdateSkuSchema)
    .mutation(async ({ ctx, input }) => {
      const sku = await ctx.db.productSKU.findUnique({
        where: { id: input.skuId },
        include: { product: { select: { id: true, baseImage: true } } },
      });
      if (!sku) {
        throw notFound("SKU");
      }

      if (input.sku !== sku.sku) {
        const codeTaken = await ctx.db.productSKU.findUnique({
          where: { sku: input.sku },
          select: { id: true },
        });
        if (codeTaken) {
          throw badRequest(`SKU code "${input.sku}" is already in use`);
        }
      }

      const nextImage = input.imageUrl ?? sku.product.baseImage;

      const updated = await orUniqueViolation(
        () =>
          ctx.db.productSKU.update({
            where: { id: sku.id },
            data: {
              sku: input.sku,
              price: input.price,
              originalPrice: input.originalPrice ?? input.price,
              stock: input.stock,
              imageUrl: nextImage,
            },
          }),
        "That SKU code is already in use"
      );

      if (sku.imageUrl !== nextImage) {
        await cleanupImageIfUnused(sku.imageUrl);
      }

      return serializeSku(updated);
    }),

  deleteSku: adminProcedure
    .input(adminSkuIdSchema)
    .mutation(async ({ ctx, input }) => {
      const sku = await ctx.db.productSKU.findUnique({
        where: { id: input.skuId },
        include: { product: { select: { id: true } } },
      });
      if (!sku) {
        throw notFound("SKU");
      }

      const siblings = await ctx.db.productSKU.count({
        where: { productId: sku.productId },
      });
      if (siblings <= 1) {
        throw badRequest("A product must keep at least one SKU");
      }

      await ctx.db.productSKU.delete({ where: { id: sku.id } });
      await cleanupImageIfUnused(sku.imageUrl);

      return { id: sku.id };
    }),

  listCategories: adminProcedure.query(async ({ ctx }) => {
    const categories = await ctx.db.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      productCount: category._count.products,
    }));
  }),

  createCategory: adminProcedure
    .input(adminCreateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.name);
      if (!slug) {
        throw badRequest("Category name is invalid");
      }

      const taken = await ctx.db.category.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (taken) {
        throw badRequest(`A category with the slug "${slug}" exists`);
      }

      try {
        return await ctx.db.category.create({
          data: {
            name: input.name,
            slug,
            description: input.description || null,
          },
        });
      } catch (error) {
        if (uniqueViolation(error)) {
          throw badRequest(`A category with the slug "${slug}" exists`);
        }
        throw error;
      }
    }),

  listOrders: adminProcedure
    .input(adminListOrdersSchema)
    .query(async ({ ctx, input }) => {
      const orders = await ctx.db.order.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        orderBy: { createdAt: "desc" },
        where: input.status ? { status: input.status } : undefined,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            select: {
              id: true,
              productName: true,
              skuCode: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              sku: { select: { imageUrl: true } },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (orders.length > input.limit) {
        nextCursor = orders.pop()?.id;
      }

      return {
        orders: orders.map((order) => ({
          id: order.id,
          status: order.status,
          paymentMethod: order.paymentMethod,
          totalAmount: Number(order.totalAmount),
          paidAt: order.paidAt,
          paymentRef: order.paymentRef,
          shippingInfo: order.shippingInfo as ShippingInfo,
          user: order.user,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          items: order.items.map((item) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
            imageUrl: item.sku?.imageUrl ?? null,
          })),
        })),
        nextCursor,
      };
    }),

  updateOrderStatus: adminProcedure
    .input(adminUpdateOrderStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: { items: { select: { skuId: true, quantity: true } } },
      });
      if (!order) {
        throw notFound("Order");
      }

      if (order.status === input.status) {
        return { id: order.id, status: order.status, paidAt: order.paidAt };
      }

      if (!ORDER_TRANSITIONS[order.status].includes(input.status)) {
        throw badRequest(
          `${order.status} orders cannot move to ${input.status}`
        );
      }

      return await ctx.db.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: order.id },
          data: {
            status: input.status,
            ...(input.status === "PAID" && !order.paidAt
              ? { paidAt: new Date() }
              : {}),
          },
        });

        if (RESTOCK_STATUSES.includes(input.status)) {
          for (const item of order.items) {
            if (!item.skuId) {
              continue;
            }
            // biome-ignore lint/performance/noAwaitInLoops: restock runs sequentially inside the transaction
            await tx.productSKU.update({
              where: { id: item.skuId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        return {
          id: updated.id,
          status: updated.status,
          paidAt: updated.paidAt,
        };
      });
    }),

  sweepImages: adminProcedure.mutation(() => sweepUnusedImages()),
});
