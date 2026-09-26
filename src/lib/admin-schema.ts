import { z } from "zod";

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
