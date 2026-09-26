import z from "zod";
import { OrderStatus } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Shared order-status rules (used by the admin router and the status UI)
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = Object.values(OrderStatus) as [
  OrderStatus,
  ...OrderStatus[],
];

/** Allowed next statuses per current status; terminal states list none. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "PROCESSING", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

/** Statuses that put ordered units back in stock (entered at most once each). */
export const RESTOCK_STATUSES: OrderStatus[] = ["CANCELLED", "REFUNDED"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

// ---------------------------------------------------------------------------
// Server input schemas
// ---------------------------------------------------------------------------

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const skuInput = z.object({
  sku: z.string().trim().min(1, "SKU code is required").max(80),
  price: z.number().positive("Price must be greater than 0").max(99_999_999),
  originalPrice: z.number().positive().max(99_999_999).nullish(),
  stock: z.number().int().min(0).max(1_000_000),
  imageUrl: z.url("Enter a valid image URL").nullish(),
  optionValues: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        value: z.string().trim().min(1).max(60),
      })
    )
    .max(10)
    .default([]),
});

export const adminCreateProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Name must be at least 3 characters")
      .max(120),
    slug: z
      .string()
      .trim()
      .min(3)
      .max(160)
      .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens"),
    description: z
      .string()
      .trim()
      .min(20, "Write a short description")
      .max(5000),
    categoryId: z.string().min(1, "Select a category"),
    baseImage: z.url("Upload a product image"),
    isPublished: z.boolean(),
    skus: z.array(skuInput).min(1, "Add at least one SKU").max(100),
  })
  .refine(
    (product) => {
      const firstNames = optionNameSet(product.skus[0]?.optionValues ?? []);
      return product.skus.every((sku) =>
        sameNames(sku.optionValues ?? [], firstNames)
      );
    },
    { error: "Every SKU must select the same set of options", path: ["skus"] }
  )
  .refine(
    (product) => {
      const seen = new Set<string>();
      for (const sku of product.skus) {
        const key = comboKey(sku.optionValues ?? []);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
      }
      return true;
    },
    {
      error: "Duplicate option combination — each SKU must be unique",
      path: ["skus"],
    }
  );

export type AdminCreateProductInput = z.infer<typeof adminCreateProductSchema>;

export const adminUpdateProductSchema = z.object({
  productId: z.cuid2(),
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(120),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(160)
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens"),
  description: z.string().trim().min(20, "Write a short description").max(5000),
  categoryId: z.string().min(1, "Select a category"),
  baseImage: z.url("Upload a product image"),
  isPublished: z.boolean(),
});

export const adminProductIdSchema = z.object({ productId: z.cuid2() });

export const adminCreateSkuSchema = z.object({
  productId: z.cuid2(),
  sku: z.string().trim().min(1, "SKU code is required").max(80),
  price: z.number().positive("Price must be greater than 0").max(99_999_999),
  originalPrice: z.number().positive().max(99_999_999).nullish(),
  stock: z.number().int().min(0).max(1_000_000),
  imageUrl: z.url("Enter a valid image URL").nullish(),
  optionValueIds: z.array(z.cuid2()).max(10).default([]),
  newValues: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        value: z.string().trim().min(1).max(60),
      })
    )
    .max(10)
    .default([]),
});

export const adminUpdateSkuSchema = z.object({
  skuId: z.cuid2(),
  sku: z.string().trim().min(1, "SKU code is required").max(80),
  price: z.number().positive("Price must be greater than 0").max(99_999_999),
  originalPrice: z.number().positive().max(99_999_999).nullish(),
  stock: z.number().int().min(0).max(1_000_000),
  imageUrl: z.url("Enter a valid image URL").nullish(),
});

export const adminSkuIdSchema = z.object({ skuId: z.cuid2() });

export const adminCreateCategorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  description: z.string().trim().max(200).nullish(),
});

export const adminListProductsSchema = z.object({
  search: z.string().trim().max(120).optional(),
  cursor: z.string().nullish(),
  limit: z.number().min(1).max(50).default(20),
});

export const adminListOrdersSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  cursor: z.string().nullish(),
  limit: z.number().min(1).max(50).default(20),
});

export const adminUpdateOrderStatusSchema = z.object({
  orderId: z.cuid2(),
  status: z.enum(ORDER_STATUSES),
});

// ---------------------------------------------------------------------------
// Client form schemas: string inputs (what the HTML controls hold) that
// transform into numbers/nulls matching the server input schemas above.
// ---------------------------------------------------------------------------

function moneyField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => Number(value) > 0, `${label} must be greater than 0`)
    .transform(Number);
}

function discountField() {
  return z
    .string()
    .trim()
    .refine(
      (value) => value === "" || Number(value) > 0,
      "Enter a positive amount or leave blank"
    )
    .transform((value) => (value === "" ? null : Number(value)));
}

function stockField() {
  return z
    .string()
    .trim()
    .min(1, "Stock is required")
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 0,
      "Stock must be a whole number (0 or more)"
    )
    .transform(Number);
}

function imageField() {
  return z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.url().safeParse(value).success,
      "Enter a valid image URL"
    )
    .transform((value) => (value === "" ? null : value));
}

const skuRowInput = z.object({
  values: z.array(
    z.object({
      name: z.string().trim().min(1).max(40),
      value: z.string().trim().min(1).max(60),
    })
  ),
  sku: z.string().trim().min(1, "SKU code is required").max(80),
  price: moneyField("Price"),
  originalPrice: discountField(),
  stock: stockField(),
  imageUrl: imageField(),
});

const productFieldSchemas = {
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(120),
  slug: z
    .string()
    .trim()
    .min(3, "Slug is required")
    .max(160)
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens"),
  description: z
    .string()
    .trim()
    .min(20, "Write at least a short paragraph (20+ characters)")
    .max(5000),
  categoryId: z.string().min(1, "Select a category"),
  baseImage: z.string().trim().min(1, "Upload a product image"),
  isPublished: z.boolean(),
};

export const adminProductFormSchema = z.object({
  ...productFieldSchemas,
  options: z.array(
    z.object({
      name: z.string(),
      values: z.string(),
    })
  ),
  skus: z.array(skuRowInput).min(1, "Add at least one SKU"),
});

export type AdminProductFormInput = z.input<typeof adminProductFormSchema>;
export type AdminProductFormOutput = z.output<typeof adminProductFormSchema>;
export type SkuRowInput = z.input<typeof skuRowInput>;
export type SkuRowOutput = z.output<typeof skuRowInput>;

export const adminProductEditFormSchema = z.object(productFieldSchemas);

export type AdminProductEditFormValues = z.input<
  typeof adminProductEditFormSchema
>;

export const adminSkuFormSchema = z.object({
  sku: z.string().trim().min(1, "SKU code is required").max(80),
  price: moneyField("Price"),
  originalPrice: discountField(),
  stock: stockField(),
  imageUrl: imageField(),
});

export type AdminSkuFormValues = z.input<typeof adminSkuFormSchema>;
export type AdminSkuFormOutput = z.output<typeof adminSkuFormSchema>;

export const adminCategoryFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  description: z.string().trim().max(200),
});

export type AdminCategoryFormValues = z.input<typeof adminCategoryFormSchema>;

// ---------------------------------------------------------------------------
// Variant helpers shared by the create form and the router
// ---------------------------------------------------------------------------

export function comboKey(values: Array<{ name: string; value: string }>) {
  return [...values]
    .map((entry) => `${entry.name}=${entry.value}`)
    .sort((a, b) => a.localeCompare(b))
    .join("|");
}

function optionNameSet(values: Array<{ name: string }>) {
  return new Set(values.map((entry) => entry.name));
}

function sameNames(values: Array<{ name: string }>, names: Set<string>) {
  const own = optionNameSet(values);
  return own.size === names.size && [...own].every((name) => names.has(name));
}
