import { z } from "zod";
import { PHONE_PATTERN } from "@/lib/order-schema";

export const byIdSchema = z.object({ id: z.cuid2() });

export const categoryListSchema = z.object({
  search: z.string().trim().max(200).optional(),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(500).optional(),
});

export const categoryUpdateSchema = categoryInputSchema.partial().extend({
  id: z.cuid2(),
});

export const productOptionInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  values: z.array(z.string().trim().min(1).max(60)).min(1).max(10),
});

export const productSkuInputSchema = z.object({
  code: z.string().trim().min(1).max(64),
  price: z.coerce.number().nonnegative(),
  originalPrice: z.coerce.number().nonnegative().nullish(),
  stock: z.coerce.number().int().min(0).default(0),
  imageUrl: z.string().trim().max(500).optional(),
  optionValues: z
    .array(
      z.object({
        option: z.string().trim().min(1).max(60),
        value: z.string().trim().min(1).max(60),
      })
    )
    .default([]),
});

export const productListSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  cursor: z.string().cuid2().nullish(),
  search: z.string().trim().max(200).optional(),
  categoryId: z.cuid2().optional(),
  status: z.enum(["Published", "Draft"]).optional(),
  showArchived: z.boolean().optional(),
});

export const customerListSchema = z.object({
  limit: z.number().int().min(1).max(50).default(25),
  cursor: z.string().cuid2().nullish(),
  search: z.string().trim().max(200).optional(),
});

export const productUpsertSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    slug: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(4000),
    categoryId: z.cuid2(),
    baseImage: z.string().trim().max(600).default(""),
    isPublished: z.boolean().default(false),
    options: z.array(productOptionInputSchema).max(3).default([]),
    skus: z.array(productSkuInputSchema).min(1).max(100),
  })
  .superRefine((data, ctx) => {
    const optionNames = data.options.map((option) => option.name.toLowerCase());
    if (new Set(optionNames).size !== optionNames.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Variant option names must be unique.",
      });
    }
    data.options.forEach((option, index) => {
      const values = option.values.map((value) => value.toLowerCase());
      if (new Set(values).size !== values.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options", index, "values"],
          message: "Variant values must be unique.",
        });
      }
    });

    const skuCodes = data.skus.map((sku) => sku.code);
    if (new Set(skuCodes).size !== skuCodes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skus"],
        message: "SKU codes must be unique.",
      });
    }

    const optionLookup = new Map(
      data.options.map((option, index) => [
        option.name.toLowerCase(),
        { index, values: option.values.map((value) => value.toLowerCase()) },
      ])
    );

    data.skus.forEach((sku, skuIndex) => {
      const coveredOptions = new Set<string>();
      for (const pair of sku.optionValues) {
        const option = optionLookup.get(pair.option.toLowerCase());
        if (!option) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["skus", skuIndex, "optionValues"],
            message: `Option "${pair.option}" is not defined.`,
          });
          continue;
        }
        if (!option.values.includes(pair.value.toLowerCase())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["skus", skuIndex, "optionValues"],
            message: `Value "${pair.value}" is not defined for option "${pair.option}".`,
          });
        }
        if (coveredOptions.has(pair.option.toLowerCase())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["skus", skuIndex, "optionValues"],
            message: `Option "${pair.option}" is used more than once.`,
          });
        }
        coveredOptions.add(pair.option.toLowerCase());
      }
      if (optionLookup.size > 0 && coveredOptions.size !== optionLookup.size) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["skus", skuIndex, "optionValues"],
          message: "Every variant must specify a value for each option.",
        });
      }
    });
  });

export const productCreateSchema = productUpsertSchema;

export const productUpdateSchema = productUpsertSchema.extend({
  id: z.cuid2(),
});

// ---------------------------------------------------------------------------
// Order status metadata — shared by the admin UI (badges, filters, next-step
// pickers) and the router, which enforces exactly this transition map.
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "ASSIGNED",
  "OUT_FOR_DELIVERY",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type AdminOrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<AdminOrderStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  PROCESSING: "Processing",
  ASSIGNED: "Assigned",
  OUT_FOR_DELIVERY: "Out for delivery",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const ORDER_TRANSITIONS: Record<
  AdminOrderStatus,
  readonly AdminOrderStatus[]
> = {
  PENDING: ["PAID", "ASSIGNED", "CANCELLED"],
  PAID: ["ASSIGNED", "PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "ASSIGNED", "OUT_FOR_DELIVERY", "CANCELLED"],
  ASSIGNED: ["OUT_FOR_DELIVERY", "PROCESSING", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "OUT_FOR_DELIVERY", "CANCELLED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export const PAYMENT_METHODS = ["ESEWA", "KHALTI", "COD"] as const;

export type AdminPaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<AdminPaymentMethod, string> = {
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  COD: "COD",
};

// ---------------------------------------------------------------------------
// Refund metadata — mirrors the Refund table. Refunds only exist once money
// has actually been collected (paidAt set) and the order was cancelled or
// marked refunded; the admin UI advances them through this transition map.
// ---------------------------------------------------------------------------

export const REFUND_STATUSES = [
  "PENDING",
  "PROCESSING",
  "REFUNDED",
  "FAILED",
] as const;

export type AdminRefundStatus = (typeof REFUND_STATUSES)[number];

export const REFUND_STATUS_LABELS: Record<AdminRefundStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

export const REFUND_TRANSITIONS: Record<
  AdminRefundStatus,
  readonly AdminRefundStatus[]
> = {
  PENDING: ["PROCESSING", "REFUNDED", "FAILED"],
  PROCESSING: ["PENDING", "REFUNDED", "FAILED"],
  FAILED: ["PENDING", "PROCESSING"],
  REFUNDED: [],
};

// ---------------------------------------------------------------------------
// Admin form schemas (react-hook-form + zodResolver). The string-typed fields
// mirror what the inputs hold; the output types carry parsed numbers.
// ---------------------------------------------------------------------------

/** Stable identity for a variant combo such as [{name: "Color", value: "Red"}]. */
export function comboKey(values: Array<{ name: string; value: string }>) {
  return values
    .map(
      (entry) => `${entry.name.toLowerCase()}\u0000${entry.value.toLowerCase()}`
    )
    .join("\u0001");
}

const requiredNumber = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => Number(value) >= 0, `${label} must be zero or more`)
    .transform(Number);

const requiredInteger = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 0,
      `${label} must be a whole number`
    )
    .transform(Number);

const optionalNumber = (label: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === "" || Number(value) >= 0,
      `Enter a valid ${label}`
    )
    .transform((value) => (value === "" ? null : Number(value)));

const imageValue = z
  .string()
  .trim()
  .max(600)
  .transform((value) => (value === "" ? null : value));

const skuCode = z.string().trim().min(1, "SKU code is required").max(64);

export const adminCategoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(500),
});

export type AdminCategoryFormValues = z.infer<typeof adminCategoryFormSchema>;

export const adminProductEditFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  slug: z.string().trim().min(1, "Slug is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(4000),
  categoryId: z.string().trim().min(1, "Pick a category"),
  baseImage: z.string().trim().max(600),
  isPublished: z.boolean(),
});

export type AdminProductEditFormValues = z.infer<
  typeof adminProductEditFormSchema
>;

export const adminSkuFormSchema = z.object({
  sku: skuCode,
  price: requiredNumber("price"),
  originalPrice: optionalNumber("price"),
  stock: requiredInteger("stock"),
  imageUrl: imageValue,
});

export type AdminSkuFormValues = z.input<typeof adminSkuFormSchema>;
export type AdminSkuFormOutput = z.output<typeof adminSkuFormSchema>;

export const adminProductFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  slug: z.string().trim().max(200),
  description: z.string().trim().min(1, "Description is required").max(4000),
  categoryId: z.string().trim().min(1, "Pick a category"),
  baseImage: z.string().trim().max(600),
  isPublished: z.boolean(),
  options: z
    .array(
      z.object({
        name: z.string().trim().max(60),
        values: z.string().trim().max(500),
      })
    )
    .max(3),
  skus: z
    .array(
      z.object({
        values: z.array(
          z.object({ name: z.string().trim(), value: z.string().trim() })
        ),
        sku: skuCode,
        price: requiredNumber("price"),
        originalPrice: optionalNumber("price"),
        stock: requiredInteger("stock"),
        imageUrl: imageValue,
      })
    )
    .min(1),
});

export type AdminProductFormInput = z.input<typeof adminProductFormSchema>;
export type AdminProductFormOutput = z.output<typeof adminProductFormSchema>;

// ---------------------------------------------------------------------------
// Delivery settings, delivery men and order assignment (admin procedures).
// Server-side input: plain numbers, range-checked; null means "not set".
// ---------------------------------------------------------------------------

export const deliverySettingsInputSchema = z
  .object({
    storeLat: z
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90")
      .nullable(),
    storeLng: z
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180")
      .nullable(),
    deliveryRatePerKm: z
      .number()
      .min(0, "Rate must be zero or more")
      .max(100_000, "Rate is too high")
      .nullable(),
  })
  .superRefine((value, ctx) => {
    if ((value.storeLat === null) !== (value.storeLng === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["storeLng"],
        message: "Set both store coordinates, or clear both",
      });
    }
  });

export type DeliverySettingsInput = z.infer<typeof deliverySettingsInputSchema>;

const deliveryPhone = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .regex(PHONE_PATTERN, "Enter a valid phone number (e.g. 98XXXXXXXX)");

export const deliveryManCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  phone: deliveryPhone,
  accountEmail: z.email("Enter a valid email").nullish(),
});

export type DeliveryManCreateInput = z.infer<typeof deliveryManCreateSchema>;

export const deliveryManUpdateSchema = deliveryManCreateSchema.extend({
  id: z.cuid2(),
});

export const deliveryManSetActiveSchema = z.object({
  id: z.cuid2(),
  isActive: z.boolean(),
});

export const deliveryAssignSchema = z.object({
  orderId: z.cuid2(),
  deliveryManId: z.cuid2().nullable(),
});
