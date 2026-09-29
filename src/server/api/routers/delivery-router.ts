import { publicProcedure, router } from "../trpc";

function roundRupees(amount: unknown) {
  if (amount === null || amount === undefined) {
    return null;
  }
  return Math.round(Number(amount) * 100) / 100;
}

/**
 * Store delivery configuration for the checkout preview. The customer-facing
 * quote is computed in the browser with the same shared helper the order
 * creation procedure uses; the server always recomputes the final charge.
 */
export const deliveryRouter = router({
  getSettings: publicProcedure.query(async ({ ctx }) => {
    const setting = await ctx.db.storeSetting.findUnique({
      where: { id: "main" },
    });

    const storeLat = setting?.storeLat ?? null;
    const storeLng = setting?.storeLng ?? null;
    const ratePerKm = roundRupees(setting?.deliveryRatePerKm ?? null);

    return {
      configured: storeLat !== null && storeLng !== null && ratePerKm !== null,
      storeLat,
      storeLng,
      ratePerKm,
    };
  }),
});
