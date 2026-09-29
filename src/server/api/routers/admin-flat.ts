import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin";
import {
  type AdminOrderStatus,
  type AdminPaymentMethod,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
} from "@/lib/admin-schema";
import { slugify } from "@/lib/catalog";
import {
  cleanupImagesIfUnused,
  getStorageUsage,
  sweepUnusedImages,
} from "@/lib/image-cleanup";
import { db } from "@/lib/prisma";
import { adminProcedure, protectedProcedure } from "../trpc";
import {
  assertNoConflicts,
  assertSkuCodeFree,
  createVariants,
  enforceUniqueField,
  enforceUniqueSlug,
  serializeDecimal,
  type Tx,
} from "./admin-helpers";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const productIdInput = z.object({ productId: z.string().cuid2() });
const skuIdInput = z.object({ skuId: z.string().cuid2() });

const flatProductCreateInput = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(200).optional(),
  description: z.string().trim().min(1).max(4000),
  categoryId: z.string().trim().min(1),
  baseImage: z.string().trim().max(600),
  isPublished: z.boolean(),
  skus: z
    .array(
      z.object({
        sku: z.string().trim().min(1).max(64),
        price: z.number().nonnegative(),
        originalPrice: z.number().nonnegative().nullish(),
        stock: z.number().int().min(0),
        imageUrl: z.string().trim().max(600).nullish(),
        optionValues: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(60),
              value: z.string().trim().min(1).max(60),
            })
          )
          .default([]),
      })
    )
    .min(1)
    .max(100),
});

const flatProductUpdateInput = z.object({
  productId: z.string().cuid2(),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  categoryId: z.string().trim().min(1),
  baseImage: z.string().trim().max(600),
  isPublished: z.boolean(),
});

const listProductsInput = z.object({
  search: z.string().trim().max(200).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

const createSkuInput = z.object({
  productId: z.string().cuid2(),
  sku: z.string().trim().min(1).max(64),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().nullish(),
  stock: z.number().int().min(0),
  imageUrl: z.string().trim().max(600).nullish(),
  optionValueIds: z.array(z.string().cuid2()).default([]),
  newValues: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        value: z.string().trim().min(1).max(60),
      })
    )
    .default([]),
});

const updateSkuInput = z.object({
  skuId: z.string().cuid2(),
  sku: z.string().trim().min(1).max(64),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().nullish(),
  stock: z.number().int().min(0),
  imageUrl: z.string().trim().max(600).nullish(),
});

const listOrdersInput = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  status: z.enum(ORDER_STATUSES).optional(),
  cursor: z.string().cuid2().optional(),
});

const orderStatusUpdateInput = z.object({
  orderId: z.string().cuid2(),
  status: z.enum(ORDER_STATUSES),
});

const categoryCreateInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullish(),
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface ProductWithOptions {
  id: string;
  baseImage: string;
  options: Array<{
    id: string;
    name: string;
    values: Array<{ id: string; value: string }>;
  }>;
  productSKUs: Array<{
    optionValues: Array<{ id: string }>;
  }>;
}

type OptionPick =
  | { optionId: string; optionName: string; valueId: string; value: string }
  | { optionId: string; optionName: string; createValue: string };

/** Derives the product's options (and their values) from the variant payloads. */
function deriveOptions(
  skus: Array<{ optionValues: Array<{ name: string; value: string }> }>
): Array<{ name: string; values: string[] }> {
  const byName = new Map<string, { name: string; values: Set<string> }>();
  for (const sku of skus) {
    for (const pair of sku.optionValues) {
      const key = pair.name.toLowerCase();
      const entry = byName.get(key) ?? {
        name: pair.name,
        values: new Set<string>(),
      };
      entry.values.add(pair.value);
      byName.set(key, entry);
    }
  }
  return [...byName.values()].map((entry) => ({
    name: entry.name,
    values: [...entry.values],
  }));
}

/**
 * Validates a create-SKU request against the product's options and decides,
 * per option, whether an existing value is picked or a new one must be added.
 */
function planOptionPicks(
  product: ProductWithOptions,
  input: {
    optionValueIds: string[];
    newValues: Array<{ name: string; value: string }>;
  }
): OptionPick[] {
  const optionsByName = new Map(
    product.options.map((option) => [option.name.toLowerCase(), option])
  );

  for (const fresh of input.newValues) {
    if (!optionsByName.has(fresh.name.toLowerCase())) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `This product has no option named "${fresh.name}".`,
      });
    }
  }

  const valueById = new Map<string, { optionId: string; value: string }>();
  for (const option of product.options) {
    for (const value of option.values) {
      valueById.set(value.id, { optionId: option.id, value: value.value });
    }
  }

  const picks = new Map<string, OptionPick>();
  for (const valueId of input.optionValueIds) {
    const value = valueById.get(valueId);
    if (!value) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "That option value does not exist for this product.",
      });
    }
    const option = product.options.find((row) => row.id === value.optionId);
    if (option) {
      picks.set(option.id, {
        optionId: option.id,
        optionName: option.name,
        valueId,
        value: value.value,
      });
    }
  }

  for (const fresh of input.newValues) {
    const option = optionsByName.get(fresh.name.toLowerCase());
    if (!option) {
      continue;
    }
    const existing = option.values.find(
      (row) => row.value.toLowerCase() === fresh.value.toLowerCase()
    );
    picks.set(
      option.id,
      existing
        ? {
            optionId: option.id,
            optionName: option.name,
            valueId: existing.id,
            value: existing.value,
          }
        : {
            optionId: option.id,
            optionName: option.name,
            createValue: fresh.value,
          }
    );
  }

  if (picks.size < product.options.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Every option needs a value.",
    });
  }

  const resolved: OptionPick[] = [];
  for (const option of product.options) {
    const pick = picks.get(option.id);
    if (pick) {
      resolved.push(pick);
    }
  }
  return resolved;
}

function materializePicks(
  picks: OptionPick[]
): Promise<Array<{ optionName: string; value: string; valueId: string }>> {
  return Promise.all(
    picks.map(async (pick) => {
      if ("valueId" in pick) {
        return {
          optionName: pick.optionName,
          value: pick.value,
          valueId: pick.valueId,
        };
      }
      const created = await db.productOptionValue.create({
        data: { optionId: pick.optionId, value: pick.createValue },
      });
      return {
        optionName: pick.optionName,
        value: pick.createValue,
        valueId: created.id,
      };
    })
  );
}

function assertCombinationFree(
  product: ProductWithOptions,
  valueIds: string[]
) {
  const wanted = new Set(valueIds);
  const taken = product.productSKUs.some((sku) => {
    const ids = sku.optionValues.map((value) => value.id);
    return ids.length === wanted.size && ids.every((id) => wanted.has(id));
  });
  if (taken) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A SKU with this option combination already exists.",
    });
  }
}

function skuLabels(
  optionNames: Map<string, string>,
  rows: Array<{ optionId: string; value: string }>
) {
  return rows.map(
    (row) => `${optionNames.get(row.optionId) ?? "Option"}: ${row.value}`
  );
}

function parseShippingInfo(value: unknown) {
  const source =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const text = (key: string) =>
    typeof source[key] === "string" ? source[key] : "";
  const coord = (key: string) =>
    typeof source[key] === "number" && Number.isFinite(source[key])
      ? (source[key] as number)
      : null;
  return {
    fullName: text("fullName"),
    address: text("address"),
    city: text("city"),
    province: text("province"),
    phone: text("phone"),
    deliveryLat: coord("deliveryLat"),
    deliveryLng: coord("deliveryLng"),
  };
}

interface AdminOrderRow {
  id: string;
  status: AdminOrderStatus;
  paymentMethod: AdminPaymentMethod;
  paidAt: Date | null;
  createdAt: Date;
  totalAmount: unknown;
  subtotal: unknown;
  discountAmount: unknown;
  deliveryCharge: unknown;
  deliveryDistanceKm: unknown;
  deliveryRatePerKm: unknown;
  storeLat: number | null;
  storeLng: number | null;
  shippingInfo: unknown;
  user: { email: string } | null;
  deliveryMan: { id: string; name: string; phone: string } | null;
  items: Array<{
    id: string;
    productName: string;
    skuCode: string;
    quantity: number;
    totalPrice: unknown;
  }>;
}

function serializeAdminOrder(order: AdminOrderRow) {
  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    totalAmount: Number(order.totalAmount),
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discountAmount),
    deliveryCharge: Number(order.deliveryCharge),
    deliveryDistanceKm: serializeDecimal(order.deliveryDistanceKm),
    deliveryRatePerKm: serializeDecimal(order.deliveryRatePerKm),
    storeLat: order.storeLat,
    storeLng: order.storeLng,
    user: order.user ? { email: order.user.email } : null,
    deliveryMan: order.deliveryMan,
    shippingInfo: parseShippingInfo(order.shippingInfo),
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      skuCode: item.skuCode,
      quantity: item.quantity,
      totalPrice: Number(item.totalPrice),
    })),
  };
}

async function restockItems(
  tx: Tx,
  items: Array<{ skuId: string | null; quantity: number }>
) {
  for (const item of items) {
    if (!item.skuId) {
      continue;
    }
    // biome-ignore lint/performance/noAwaitInLoops: a transaction client must run queries sequentially
    await tx.productSKU.update({
      where: { id: item.skuId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

// Orders count toward revenue once payment has been received, regardless of
// where the order sits in the delivery lifecycle, and stop counting if the
// money goes back (cancelled/refunded).
const REVERSED_STATUSES: AdminOrderStatus[] = ["CANCELLED", "REFUNDED"];

function isRevenueOrder(row: {
  status: AdminOrderStatus;
  paidAt: Date | null;
}) {
  return row.paidAt !== null && !REVERSED_STATUSES.includes(row.status);
}

interface MonthBucket {
  label: string;
  orders: number;
  paidCount: number;
  paidRevenue: number;
}

interface DashboardOrderRow {
  createdAt: Date;
  status: AdminOrderStatus;
  paidAt: Date | null;
  totalAmount: unknown;
}

interface DashboardOrderItemRow {
  quantity: number;
  totalPrice: unknown;
  sku: {
    productId: string;
    product: { name: string; baseImage: string };
  } | null;
}

function pctChange(current: number, previous: number) {
  if (previous <= 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

function monthDeltas(current?: MonthBucket, previous?: MonthBucket) {
  if (!current || !previous) {
    return { revenue: null, orders: null, avgOrderValue: null };
  }
  const currentAov =
    current.paidCount > 0 ? current.paidRevenue / current.paidCount : 0;
  const previousAov =
    previous.paidCount > 0 ? previous.paidRevenue / previous.paidCount : 0;
  return {
    revenue: pctChange(current.paidRevenue, previous.paidRevenue),
    orders: pctChange(current.orders, previous.orders),
    avgOrderValue: pctChange(currentAov, previousAov),
  };
}

/** Buckets orders into the trailing 12 calendar months for the dashboard. */
function summarizeOrdersByMonth(rows: DashboardOrderRow[], now: Date) {
  const buckets = new Map<string, MonthBucket>();
  for (let offset = 11; offset >= 0; offset -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.set(`${month.getFullYear()}-${month.getMonth()}`, {
      label: month.toLocaleString("en-US", { month: "short" }),
      orders: 0,
      paidCount: 0,
      paidRevenue: 0,
    });
  }

  for (const row of rows) {
    const bucket = buckets.get(
      `${row.createdAt.getFullYear()}-${row.createdAt.getMonth()}`
    );
    if (!bucket) {
      continue;
    }
    bucket.orders += 1;
    if (isRevenueOrder(row)) {
      bucket.paidCount += 1;
      bucket.paidRevenue += Number(row.totalAmount);
    }
  }

  const months = [...buckets.values()];
  return {
    revenueSeries: months.map((bucket) => ({
      month: bucket.label,
      revenue: bucket.paidRevenue,
      orders: bucket.orders,
    })),
    deltas: monthDeltas(months.at(-1), months.at(-2)),
  };
}

/** Ranks the best sellers by units sold across every order item. */
function rankTopProducts(rows: DashboardOrderItemRow[]) {
  const byProduct = new Map<
    string,
    { id: string; name: string; image: string; sold: number; revenue: number }
  >();
  for (const row of rows) {
    const { sku } = row;
    if (!sku) {
      continue;
    }
    const entry = byProduct.get(sku.productId) ?? {
      id: sku.productId,
      name: sku.product.name,
      image: sku.product.baseImage,
      sold: 0,
      revenue: 0,
    };
    entry.sold += row.quantity;
    entry.revenue += Number(row.totalPrice);
    byProduct.set(sku.productId, entry);
  }
  return [...byProduct.values()].sort((a, b) => b.sold - a.sold).slice(0, 5);
}

async function requireProduct(id: string) {
  const product = await db.product.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!product) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
  }
}

async function requireCategory(id: string) {
  const category = await db.category.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!category) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Category not found." });
  }
}

const orderInclude = {
  user: { select: { email: true } },
  deliveryMan: { select: { id: true, name: true, phone: true } },
  items: true,
} as const;

// ---------------------------------------------------------------------------
// Flat procedures — the surface used by the admin pages and the verification
// script. Nested `categories.*` / `products.*` live in admin-router.ts.
// ---------------------------------------------------------------------------

export const flatAdminProcedures = {
  check: protectedProcedure.query(({ ctx }) => ({
    isAdmin: isAdminEmail(ctx.user.email),
  })),

  stats: adminProcedure.query(async () => {
    const now = new Date();
    const monthWindowStart = new Date(
      now.getFullYear(),
      now.getMonth() - 11,
      1
    );
    const [
      total,
      published,
      skus,
      outOfStock,
      orderTotal,
      statusCounts,
      revenue,
      customers,
      storage,
      recentOrderRows,
      recentItemRows,
    ] = await Promise.all([
      db.product.count(),
      db.product.count({ where: { isPublished: true } }),
      db.productSKU.count(),
      db.productSKU.count({ where: { stock: 0 } }),
      db.order.count(),
      db.order.groupBy({ by: ["status"], _count: { _all: true } }),
      db.order.aggregate({
        where: { paidAt: { not: null }, status: { notIn: REVERSED_STATUSES } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      db.user.count({ where: { orders: { some: {} } } }),
      getStorageUsage(),
      db.order.findMany({
        where: { createdAt: { gte: monthWindowStart } },
        select: {
          createdAt: true,
          status: true,
          paidAt: true,
          totalAmount: true,
        },
      }),
      db.orderItem.findMany({
        where: { skuId: { not: null } },
        select: {
          quantity: true,
          totalPrice: true,
          sku: {
            select: {
              productId: true,
              product: { select: { name: true, baseImage: true } },
            },
          },
        },
      }),
    ]);

    const byStatus = Object.fromEntries(
      ORDER_STATUSES.map((status) => [status, 0])
    ) as Record<AdminOrderStatus, number>;
    for (const row of statusCounts) {
      byStatus[row.status] = row._count._all;
    }

    const totalRevenue = Number(revenue._sum.totalAmount ?? 0);
    const paidCount = revenue._count;
    const { revenueSeries, deltas } = summarizeOrdersByMonth(
      recentOrderRows,
      now
    );

    return {
      products: {
        total,
        published,
        drafts: total - published,
        skus,
        outOfStock,
      },
      orders: {
        total: orderTotal,
        revenue: totalRevenue,
        avgOrderValue: paidCount > 0 ? totalRevenue / paidCount : 0,
        byStatus,
      },
      customers,
      storage,
      revenueSeries,
      topProducts: rankTopProducts(recentItemRows),
      deltas,
    };
  }),

  storageUsage: adminProcedure.query(() => getStorageUsage()),

  sweepImages: adminProcedure.mutation(() => sweepUnusedImages()),

  listCategories: adminProcedure.query(({ ctx }) =>
    ctx.db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, description: true },
    })
  ),

  createCategory: adminProcedure
    .input(categoryCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.category.create({
          data: {
            name: input.name,
            slug: slugify(input.name),
            description: input.description ?? null,
          },
        });
      } catch (error) {
        enforceUniqueSlug(error, "category");
      }
    }),

  listOrders: adminProcedure
    .input(listOrdersInput)
    .query(async ({ ctx, input }) => {
      const orders = await ctx.db.order.findMany({
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
        ...(input.status ? { where: { status: input.status } } : {}),
        include: orderInclude,
      });

      let nextCursor: string | null = null;
      if (orders.length > input.limit) {
        nextCursor = orders.pop()?.id ?? null;
      }

      return { orders: orders.map(serializeAdminOrder), nextCursor };
    }),

  updateOrderStatus: adminProcedure
    .input(orderStatusUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: orderInclude,
      });
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      }

      if (order.status === input.status) {
        return serializeAdminOrder(order);
      }

      if (!ORDER_TRANSITIONS[order.status].includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${order.status} orders cannot move to ${input.status}.`,
        });
      }

      const updated = await ctx.db.$transaction(async (tx) => {
        if (input.status === "CANCELLED" || input.status === "REFUNDED") {
          await restockItems(tx, order.items);
        }
        return tx.order.update({
          where: { id: order.id },
          data: {
            status: input.status,
            ...((input.status === "PAID" ||
              (input.status === "DELIVERED" &&
                order.paymentMethod === "COD")) &&
            !order.paidAt
              ? { paidAt: new Date() }
              : {}),
          },
          include: orderInclude,
        });
      });

      return serializeAdminOrder(updated);
    }),

  listProducts: adminProcedure
    .input(listProductsInput)
    .query(async ({ ctx, input }) => {
      const products = await ctx.db.product.findMany({
        take: input.limit,
        orderBy: { name: "asc" },
        ...(input.search
          ? {
              where: {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" } },
                  { slug: { contains: input.search, mode: "insensitive" } },
                ],
              },
            }
          : {}),
        select: {
          id: true,
          name: true,
          slug: true,
          baseImage: true,
          isPublished: true,
          productSKUs: { select: { price: true, stock: true } },
        },
      });

      return {
        products: products.map((product) => {
          const prices = product.productSKUs.map(
            (sku) => serializeDecimal(sku.price) ?? 0
          );
          return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            baseImage: product.baseImage,
            isPublished: product.isPublished,
            skuCount: product.productSKUs.length,
            totalStock: product.productSKUs.reduce(
              (sum, sku) => sum + sku.stock,
              0
            ),
            minPrice: prices.length > 0 ? Math.min(...prices) : null,
          };
        }),
      };
    }),

  createProduct: adminProcedure
    .input(flatProductCreateInput)
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.slug || input.name);
      const baseImage = input.baseImage || "";

      await requireCategory(input.categoryId);
      await assertNoConflicts(ctx.db, {
        slug,
        codes: input.skus.map((row) => row.sku),
      });

      try {
        return await ctx.db.$transaction(async (tx) => {
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
          await createVariants(
            tx,
            created.id,
            {
              options: deriveOptions(input.skus),
              skus: input.skus.map((row) => ({
                code: row.sku,
                price: row.price,
                originalPrice: row.originalPrice,
                stock: row.stock,
                imageUrl: row.imageUrl ?? undefined,
                optionValues: row.optionValues.map((pair) => ({
                  option: pair.name,
                  value: pair.value,
                })),
              })),
            },
            baseImage
          );
          return created;
        });
      } catch (error) {
        enforceUniqueField(error);
      }
    }),

  getProduct: adminProcedure
    .input(productIdInput)
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        include: {
          category: { select: { id: true, name: true } },
          options: {
            orderBy: { name: "asc" },
            include: {
              values: {
                orderBy: { value: "asc" },
                select: { id: true, value: true },
              },
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }

      const optionNames = new Map(
        product.options.map((option) => [option.id, option.name])
      );

      return {
        ...product,
        productSKUs: product.productSKUs.map((sku) => ({
          ...sku,
          price: Number(sku.price),
          originalPrice: sku.originalPrice ? Number(sku.originalPrice) : null,
          labels: skuLabels(optionNames, sku.optionValues),
        })),
      };
    }),

  updateProduct: adminProcedure
    .input(flatProductUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.slug);
      await requireProduct(input.productId);
      await requireCategory(input.categoryId);
      await assertNoConflicts(ctx.db, {
        slug,
        exceptProductId: input.productId,
        codes: [],
      });

      return ctx.db.product.update({
        where: { id: input.productId },
        data: {
          name: input.name,
          slug,
          description: input.description,
          categoryId: input.categoryId,
          baseImage: input.baseImage,
          isPublished: input.isPublished,
        },
      });
    }),

  deleteProduct: adminProcedure
    .input(productIdInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.product.findUnique({
        where: { id: input.productId },
        select: {
          baseImage: true,
          productSKUs: { select: { imageUrl: true } },
        },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }

      await ctx.db.product.delete({ where: { id: input.productId } });
      await cleanupImagesIfUnused([
        existing.baseImage,
        ...existing.productSKUs.map((sku) => sku.imageUrl),
      ]);
      return { id: input.productId };
    }),

  togglePublish: adminProcedure
    .input(productIdInput)
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        select: { id: true, isPublished: true },
      });
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }
      return ctx.db.product.update({
        where: { id: product.id },
        data: { isPublished: !product.isPublished },
        select: { id: true, isPublished: true },
      });
    }),

  createSku: adminProcedure
    .input(createSkuInput)
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        include: {
          options: { include: { values: true } },
          productSKUs: { include: { optionValues: { select: { id: true } } } },
        },
      });
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }

      if (product.options.length === 0 && product.productSKUs.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This product has no options, so it can only have one SKU.",
        });
      }

      await assertSkuCodeFree(ctx.db, input.sku);
      const picks = planOptionPicks(product, input);
      const resolved = await materializePicks(picks);
      assertCombinationFree(
        product,
        resolved.map((row) => row.valueId)
      );

      const created = await ctx.db.productSKU.create({
        data: {
          productId: product.id,
          sku: input.sku,
          price: input.price,
          originalPrice: input.originalPrice ?? input.price,
          stock: input.stock,
          imageUrl: input.imageUrl || product.baseImage,
          optionValues: {
            connect: resolved.map((row) => ({ id: row.valueId })),
          },
        },
        include: {
          optionValues: { select: { id: true, optionId: true, value: true } },
        },
      });

      const optionNames = new Map(
        product.options.map((option) => [option.id, option.name])
      );
      return {
        ...created,
        price: Number(created.price),
        originalPrice: Number(created.originalPrice),
        labels: skuLabels(optionNames, created.optionValues),
      };
    }),

  updateSku: adminProcedure
    .input(updateSkuInput)
    .mutation(async ({ ctx, input }) => {
      const sku = await ctx.db.productSKU.findUnique({
        where: { id: input.skuId },
        include: {
          product: {
            select: {
              baseImage: true,
              options: { select: { id: true, name: true } },
            },
          },
          optionValues: { select: { id: true, optionId: true, value: true } },
        },
      });
      if (!sku) {
        throw new TRPCError({ code: "NOT_FOUND", message: "SKU not found." });
      }

      await assertSkuCodeFree(ctx.db, input.sku, input.skuId);

      const nextOriginalPrice =
        input.originalPrice === undefined
          ? sku.originalPrice
          : (input.originalPrice ?? input.price);
      const nextImageUrl =
        input.imageUrl === undefined
          ? sku.imageUrl
          : input.imageUrl || sku.product.baseImage;

      const updated = await ctx.db.productSKU.update({
        where: { id: input.skuId },
        data: {
          sku: input.sku,
          price: input.price,
          originalPrice: nextOriginalPrice,
          stock: input.stock,
          imageUrl: nextImageUrl,
        },
      });

      const optionNames = new Map(
        sku.product.options.map((option) => [option.id, option.name])
      );
      return {
        id: updated.id,
        sku: updated.sku,
        price: Number(updated.price),
        originalPrice: Number(updated.originalPrice),
        stock: updated.stock,
        imageUrl: updated.imageUrl,
        labels: skuLabels(optionNames, sku.optionValues),
      };
    }),

  deleteSku: adminProcedure
    .input(skuIdInput)
    .mutation(async ({ ctx, input }) => {
      const sku = await ctx.db.productSKU.findUnique({
        where: { id: input.skuId },
        select: {
          imageUrl: true,
          product: { select: { productSKUs: { select: { id: true } } } },
        },
      });
      if (!sku) {
        throw new TRPCError({ code: "NOT_FOUND", message: "SKU not found." });
      }
      if (sku.product.productSKUs.length <= 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A product must keep at least one SKU.",
        });
      }

      await ctx.db.productSKU.delete({ where: { id: input.skuId } });
      await cleanupImagesIfUnused([sku.imageUrl]);
      return { id: input.skuId };
    }),
};
