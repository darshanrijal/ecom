// TEMP probe — delete after running.
import superjson from "superjson";
import { db } from "@/lib/prisma";

const sku = await db.productSKU.findFirst();
const product = await db.product.findFirst({
  include: { options: { include: { values: true } } },
});

const roundTrip = superjson.parse(
  superjson.stringify({ price: sku?.price, originalPrice: sku?.originalPrice })
) as { price: unknown; originalPrice: unknown };

console.log("raw price ctor:", sku?.price?.constructor?.name);
console.log(
  "round-trip price:",
  roundTrip.price,
  "| typeof:",
  typeof roundTrip.price
);
console.log("Number(round-trip):", Number(roundTrip.price));
console.log(
  "product with options:",
  product?.name,
  "| options:",
  product?.options.length
);

await db.$disconnect();
