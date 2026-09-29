import { TRPCError } from "@trpc/server";
import {
  byIdSchema,
  categoryInputSchema,
  categoryListSchema,
  categoryUpdateSchema,
  customerListSchema,
  productCreateSchema,
  productListSchema,
  productUpdateSchema,
} from "@/lib/admin-schema";
import { slugify } from "@/lib/catalog";
import { cleanupImagesIfUnused } from "@/lib/image-cleanup";
import { isAdminEmail } from "@/lib/admin";
import { adminProcedure, router } from "../trpc";
import { flatAdminProcedures } from "./admin-flat";
import {
  assertNoConflicts,
  createVariants,
  enforceUniqueField,
  enforceUniqueSlug,
  serializeDecimal,
} from "./admin-helpers";

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
  ...flatAdminProcedures,

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

  customers: router({
    list: adminProcedure
      .input(customerListSchema)
      .query(async ({ ctx, input }) => {
        const users = await ctx.db.user.findMany({
          take: input.limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
          skip: input.cursor ? 1 : 0,
          orderBy: { createdAt: "desc" },
          where: input.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" } },
                  { email: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : undefined,
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            emailVerified: true,
            createdAt: true,
          },
        });

        let nextCursor: string | null = null;
        if (users.length > input.limit) {
          const extra = users.pop();
          nextCursor = extra?.id ?? null;
        }

        if (users.length === 0) {
          return { items: [], nextCursor };
        }

        const orderAggs = await ctx.db.order.groupBy({
          by: ["userId"],
          where: { userId: { in: users.map((user) => user.id) } },
          _count: { _all: true },
          _sum: { totalAmount: true },
          _max: { createdAt: true },
        });
        const aggById = new Map(
          orderAggs.map((row) => [
            row.userId,
            {
              orders: row._count._all,
              totalSpent: Number(row._sum.totalAmount ?? 0),
              lastOrderAt: row._max.createdAt,
            },
          ])
        );

        return {
          items: users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            isAdmin: isAdminEmail(user.email),
            orders: aggById.get(user.id)?.orders ?? 0,
            totalSpent: aggById.get(user.id)?.totalSpent ?? 0,
            lastOrderAt: aggById.get(user.id)?.lastOrderAt ?? null,
          })),
          nextCursor,
        };
      }),

    detail: adminProcedure.input(byIdSchema).query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          emailVerified: true,
          createdAt: true,
          addresses: {
            orderBy: { province: "asc" },
            select: {
              id: true,
              province: true,
              city: true,
              zone: true,
              address: true,
            },
          },
          orders: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              status: true,
              totalAmount: true,
              createdAt: true,
              _count: { select: { items: true } },
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      const totalSpent = user.orders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        isAdmin: isAdminEmail(user.email),
        totalSpent,
        lastOrderAt: user.orders[0]?.createdAt ?? null,
        addresses: user.addresses,
        orders: user.orders.map((order) => ({
          id: order.id,
          status: order.status,
          totalAmount: Number(order.totalAmount),
          createdAt: order.createdAt,
          itemCount: order._count.items,
        })),
      };
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
        await assertNoConflicts(ctx.db, {
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
        await assertNoConflicts(ctx.db, {
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
          if (existing) {
            await cleanupImagesIfUnused([
              existing.baseImage,
              ...existing.productSKUs.map((sku) => sku.imageUrl),
            ]);
          }
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
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await ctx.db.product.delete({ where: { id: input.id } });
        await cleanupImagesIfUnused([
          existing.baseImage,
          ...existing.productSKUs.map((sku) => sku.imageUrl),
        ]);
      }),
  }),
});
