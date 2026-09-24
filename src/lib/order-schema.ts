import z from "zod";

const PHONE_PATTERN = /^\+?[\d\s-]{7,16}$/;
const NON_DIGITS = /\D/g;

export const NEPAL_PROVINCES = [
  "Koshi",
  "Madhesh",
  "Bagmati",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
] as const;

export const paymentMethodSchema = z.enum(["COD", "ESEWA", "KHALTI"]);

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const shippingInfoSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(80, "Name is too long"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine(
      (value) =>
        PHONE_PATTERN.test(value) && value.replace(NON_DIGITS, "").length >= 7,
      "Enter a valid phone number (e.g. 98XXXXXXXX)"
    ),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.email().safeParse(value).success),
  province: z
    .string()
    .min(1, "Select a province")
    .refine((v) => z.enum(NEPAL_PROVINCES).safeParse(v).success, {
      error: "Invalid province selected",
    }),
  city: z.string().trim().min(2, "Enter your city or district"),
  address: z.string().trim().min(5, "Enter your street address"),
  note: z.string().max(300, "Note is too long"),
});

export type ShippingInfo = z.infer<typeof shippingInfoSchema>;

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        skuId: z.cuid2(),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, "Your cart is empty")
    .max(50),
  shippingInfo: shippingInfoSchema,
  paymentMethod: paymentMethodSchema,
});

export const completePaymentSchema = z.object({
  orderId: z.cuid2(),
  walletNumber: z.string().trim().max(20).optional(),
});

export const orderByIdSchema = z.object({
  orderId: z.cuid2(),
});

export const listOrdersSchema = z.object({
  orderIds: z.array(z.cuid2()).max(50).default([]),
});
