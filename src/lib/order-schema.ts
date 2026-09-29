import z from "zod";

const PHONE_PATTERN = /^\+?[\d\s-]{7,16}$/;
const NON_DIGITS = /\D/g;

export { PHONE_PATTERN };

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
  deliveryLat: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  deliveryLng: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});

export type ShippingInfo = z.infer<typeof shippingInfoSchema>;

const coordinateField = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine(
      (value) => Number.isFinite(Number(value)),
      `Enter a valid ${label.toLowerCase()}`
    )
    .refine(
      (value) => Number(value) >= min && Number(value) <= max,
      `${label} must be between ${min} and ${max}`
    )
    .transform(Number);

/** Checkout form variant: coordinates are typed into text inputs as strings. */
export const shippingInfoFormSchema = shippingInfoSchema.extend({
  deliveryLat: coordinateField("Latitude", -90, 90),
  deliveryLng: coordinateField("Longitude", -180, 180),
});

export type ShippingFormValues = z.infer<typeof shippingInfoFormSchema>;

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

export const orderByIdSchema = z.object({
  orderId: z.cuid2(),
});

export const changePaymentMethodSchema = z.object({
  orderId: z.cuid2(),
  paymentMethod: paymentMethodSchema,
});

/**
 * Statuses a customer may cancel their own order from. Admins can cancel
 * from anywhere the transition map allows; customers stop at PROCESSING —
 * once the order is shipped or out for delivery the store has to decide.
 */
export const CUSTOMER_CANCELLABLE_STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "ASSIGNED",
] as const;

export function isCustomerCancellable(status: string): boolean {
  return (CUSTOMER_CANCELLABLE_STATUSES as readonly string[]).includes(status);
}

/**
 * The payment method can be switched while the order is still unpaid and
 * hasn't entered fulfilment — the same PENDING/ASSIGNED window the payment
 * routes accept, so a change never fights an in-progress charge.
 */
export function canChangePaymentMethod(order: {
  status: string;
  paidAt: Date | null;
}): boolean {
  return (
    order.paidAt === null &&
    (order.status === "PENDING" || order.status === "ASSIGNED")
  );
}

export const listOrdersSchema = z.object({
  orderIds: z.array(z.cuid2()).max(50).default([]),
});
