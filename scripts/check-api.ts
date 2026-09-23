// biome-ignore-all lint: dev script
/**
 * Exercises EVERY tRPC procedure in appRouter against the real database and
 * prints a PASS/FAIL table.
 *
 *   bun scripts/check-api.ts      (or: bun run check:api)
 *
 * Public procedures are called anonymously; protected procedures run against a
 * throwaway user + session that are deleted at the end. Every result is also
 * pushed through a SuperJSON round-trip, because that is the wire format the
 * browser actually receives (catches Prisma Decimal / Date surprises).
 *
 * Exits non-zero if any check fails.
 */

import { createId } from "@paralleldrive/cuid2";
import SuperJSON from "superjson";
import { db } from "@/lib/prisma";
import { createCaller } from "@/server/api/root";
import type { createTRPCContext } from "@/server/api/trpc";

type Ctx = Awaited<ReturnType<typeof createTRPCContext>>;

interface Row {
  name: string;
  ok: boolean;
  detail?: string;
}

const rows: Row[] = [];

function errText(error: unknown): string {
  if (error instanceof Error) {
    const code =
      "code" in error && typeof error.code === "string"
        ? ` [${error.code}]`
        : "";
    return `${error.name}${code}: ${error.message}`;
  }
  return String(error);
}

/** Must succeed; result must survive the SuperJSON wire format. */
async function check(name: string, run: () => unknown | Promise<unknown>) {
  try {
    const out = await run();
    SuperJSON.stringify(out);
    rows.push({ name, ok: true });
    return out;
  } catch (error) {
    rows.push({ name, ok: false, detail: errText(error) });
    return undefined;
  }
}

/** Must fail with an error containing `expect` (verifies friendly errors). */
async function checkFails(name: string, run: () => unknown, expect?: string) {
  try {
    await run();
    rows.push({ name, ok: false, detail: "expected an error, got success" });
  } catch (error) {
    const text = errText(error);
    const ok = !expect || text.includes(expect);
    rows.push({
      name,
      ok,
      detail: ok
        ? `rejected: ${text}`
        : `wrong error: ${text} (wanted "${expect}")`,
    });
  }
}

/** Deserialize exactly like the browser would. */
function overTheWire<T>(value: T): T {
  return SuperJSON.parse(SuperJSON.stringify(value)) as T;
}

async function main() {
  // ---- fixtures (fail loudly if the catalog was never seeded) ------------
  const product = await db.product.findFirst({
    where: { isPublished: true },
    include: {
      productSKUs: { orderBy: { price: "asc" }, take: 1 },
      category: true,
    },
  });
  if (!product || product.productSKUs.length === 0) {
    throw new Error("catalog is empty — run: bun seed.ts");
  }

  const skuWithStock = await db.productSKU.findFirst({
    where: { stock: { gte: 5 } },
    orderBy: { price: "asc" },
  });
  if (!skuWithStock) {
    throw new Error("no SKU with stock >= 5 — run: bun seed.ts");
  }

  const option = await db.productOption.findFirst({
    select: { productId: true },
  });

  const stockSnapshot = await db.productSKU.findUnique({
    where: { id: skuWithStock.id },
    select: { stock: true },
  });
  if (!stockSnapshot) {
    throw new Error("fixture SKU vanished");
  }
  const stockBefore = stockSnapshot.stock;
  const createdOrderIds: string[] = [];

  const anon = createCaller(
    () => ({ db, session: null, headers: new Headers() }) satisfies Ctx
  );

  // ---- public queries -----------------------------------------------------
  await check("health", () => anon.health());

  await check("products.getAllProducts", () =>
    anon.products.getAllProducts({ limit: 5 })
  );

  await check("products.getProductBySlug", () =>
    anon.products.getProductBySlug({ slug: product.slug })
  );

  await check("products.getProductVariants", () =>
    anon.products.getProductVariants({
      productId: option?.productId ?? product.id,
    })
  );

  await check(
    "products.getProductBySKU (numeric prices over the wire)",
    async () => {
      const raw = await anon.products.getProductBySKU({
        skuId: skuWithStock.id,
      });
      const wire = overTheWire(raw);
      if (typeof wire.price !== "number") {
        throw new Error(
          `price came through as ${typeof wire.price}, want number`
        );
      }
      if (typeof wire.originalPrice !== "number") {
        throw new Error(
          `originalPrice came through as ${typeof wire.originalPrice}, want number`
        );
      }
      return wire;
    }
  );

  await checkFails(
    "products.getProductBySKU (unknown id -> NOT_FOUND)",
    () => anon.products.getProductBySKU({ skuId: createId() }),
    "[NOT_FOUND]"
  );

  const searchTerm = product.name.split(/\s+/)[0];
  await check("products.searchProduct", () =>
    anon.products.searchProduct({ search: searchTerm })
  );

  await check("products.getProductsByCategorySlug", () =>
    anon.products.getProductsByCategorySlug({
      categorySlug: product.category.slug,
    })
  );

  await check("products.getHomeData", () => anon.products.getHomeData());

  await check("products.getSKUsByIds (drops unknown ids)", async () => {
    const out = await anon.products.getSKUsByIds({
      skuIds: [skuWithStock.id, "00000000000000000000000000"],
    });
    if (out.length !== 1) {
      throw new Error(`expected exactly 1 SKU, got ${out.length}`);
    }
    if (typeof out[0].price !== "number") {
      throw new Error(`price came through as ${typeof out[0].price}`);
    }
    return out;
  });

  await check("products.getRelatedProducts", () =>
    anon.products.getRelatedProducts({ slug: product.slug })
  );

  await check(
    "products.getRelatedProducts (unknown slug -> empty)",
    async () => {
      const out = await anon.products.getRelatedProducts({
        slug: "no-such-slug",
      });
      if (out.products.length !== 0) {
        throw new Error("expected an empty list for an unknown slug");
      }
      return out;
    }
  );

  // ---- protected procedures reject anonymous callers ----------------------
  await checkFails(
    "cart.getCartItems (anonymous -> UNAUTHORIZED)",
    () => anon.cart.getCartItems(),
    "[UNAUTHORIZED]"
  );
  await checkFails(
    "cart.createCart (anonymous -> UNAUTHORIZED)",
    () => anon.cart.createCart(),
    "[UNAUTHORIZED]"
  );
  await checkFails(
    "getActiveSessions (anonymous -> UNAUTHORIZED)",
    () => anon.getActiveSessions(),
    "[UNAUTHORIZED]"
  );

  // ---- authenticated: full cart lifecycle ---------------------------------
  const userId = createId();
  const otherUserId = createId();
  const user = await db.user.create({
    data: {
      id: userId,
      name: "API Check",
      email: `api-check-${userId}@example.com`,
      emailVerified: true,
    },
  });
  const sessionRow = await db.session.create({
    data: {
      id: createId(),
      userId,
      token: createId(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const liveSessionRow = await db.session.create({
    data: {
      id: createId(),
      userId,
      token: createId(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const authed = createCaller(
    () =>
      ({
        db,
        session: { user, session: sessionRow },
        headers: new Headers(),
      }) as unknown as Ctx
  );

  try {
    await check("cart.createCart", () => authed.cart.createCart());

    await checkFails(
      "cart.addToCart (dead SKU -> friendly NOT_FOUND)",
      () => authed.cart.addToCart({ skuId: createId(), quantity: 1 }),
      "no longer available"
    );

    await checkFails(
      "cart.addToCart (quantity > stock -> friendly error)",
      () =>
        authed.cart.addToCart({
          skuId: skuWithStock.id,
          quantity: Math.min(skuWithStock.stock + 1, 999),
        }),
      "left in stock"
    );

    await check("cart.addToCart (fresh item, qty 2)", () =>
      authed.cart.addToCart({ skuId: skuWithStock.id, quantity: 2 })
    );

    await check("cart.getCartItems (single line, qty 2)", async () => {
      const items = await authed.cart.getCartItems();
      const line = items.find((i) => i.skuId === skuWithStock.id);
      if (!line) throw new Error("the added line is missing");
      if (line.quantity !== 2) {
        throw new Error(`expected quantity 2, got ${line.quantity}`);
      }
      return items;
    });

    await check("cart.addToCart (same SKU increments)", () =>
      authed.cart.addToCart({ skuId: skuWithStock.id, quantity: 1 })
    );

    await check("cart.getCartItems (incremented to 3)", async () => {
      const items = await authed.cart.getCartItems();
      const line = items.find((i) => i.skuId === skuWithStock.id);
      if (line?.quantity !== 3) {
        throw new Error(`expected quantity 3, got ${line?.quantity}`);
      }
      return items;
    });

    await check("cart.updateQuantity", () =>
      authed.cart.updateQuantity({ skuId: skuWithStock.id, quantity: 4 })
    );

    await check("cart.getCartItems (updated to 4)", async () => {
      const items = await authed.cart.getCartItems();
      const line = items.find((i) => i.skuId === skuWithStock.id);
      if (line?.quantity !== 4) {
        throw new Error(`expected quantity 4, got ${line?.quantity}`);
      }
      return items;
    });

    await check("cart.removeAllItems", () => authed.cart.removeAllItems());

    await check("cart.getCartItems (empty after clear)", async () => {
      const items = await authed.cart.getCartItems();
      if (items.length !== 0) {
        throw new Error(`expected an empty cart, got ${items.length} lines`);
      }
      return items;
    });

    await check("cart.removeItem (missing line is a no-op)", () =>
      authed.cart.removeItem({ skuId: skuWithStock.id })
    );

    await checkFails(
      "cart.updateQuantity (missing line -> friendly NOT_FOUND)",
      () => authed.cart.updateQuantity({ skuId: skuWithStock.id, quantity: 2 }),
      "[NOT_FOUND]"
    );

    await check("getActiveSessions", async () => {
      const out = await authed.getActiveSessions();
      if (!out.some((s) => s.id === liveSessionRow.id)) {
        throw new Error("temp session missing from the list");
      }
      return out;
    });

    await check("deleteSession", () =>
      authed.deleteSession({ sessionId: liveSessionRow.id })
    );

    await checkFails(
      "deleteSession (already gone -> friendly NOT_FOUND)",
      () => authed.deleteSession({ sessionId: liveSessionRow.id }),
      "[NOT_FOUND]"
    );

    // ---- product reviews (authenticated only) -----------------------------
    let myReviewId = "";
    let otherReviewId = "";

    await checkFails(
      "reviews.create (anonymous -> UNAUTHORIZED)",
      () =>
        anon.reviews.create({
          productId: product.id,
          rating: 5,
          comment: "Great product!",
        }),
      "[UNAUTHORIZED]"
    );

    await checkFails(
      "reviews.delete (anonymous -> UNAUTHORIZED)",
      () => anon.reviews.delete({ reviewId: createId() }),
      "[UNAUTHORIZED]"
    );

    await check("reviews.create (new 5-star review)", async () => {
      const review = await authed.reviews.create({
        productId: product.id,
        rating: 5,
        comment: "Solid product, exactly as described.",
      });
      myReviewId = review.id;
      if (review.rating !== 5) {
        throw new Error(`expected rating 5, got ${review.rating}`);
      }
      return review;
    });

    await check(
      "reviews.list (summary + own review over the wire)",
      async () => {
        const wire = overTheWire(
          await anon.reviews.list({ productId: product.id })
        );
        if (wire.summary.count < 1) {
          throw new Error(
            `expected summary.count >= 1, got ${wire.summary.count}`
          );
        }
        if (typeof wire.summary.average !== "number") {
          throw new Error(
            `average came through as ${typeof wire.summary.average}`
          );
        }
        if (wire.summary.distribution.length !== 5) {
          throw new Error("distribution should have 5 buckets");
        }
        const mine = wire.reviews.find((r) => r.userId === userId);
        if (!mine || mine.rating !== 5) {
          throw new Error("the created review is missing from the list");
        }
        if (!(wire.reviews[0].createdAt instanceof Date)) {
          throw new Error("createdAt did not survive the wire format");
        }
        return wire;
      }
    );

    await check("reviews.create (re-submit updates own review)", async () => {
      const review = await authed.reviews.create({
        productId: product.id,
        rating: 3,
        comment: "Changed my mind after a week of use.",
      });
      if (review.id !== myReviewId) {
        throw new Error(
          "expected the same review to be updated, not duplicated"
        );
      }
      if (review.rating !== 3) {
        throw new Error(`expected rating 3, got ${review.rating}`);
      }
      return review;
    });

    await checkFails(
      "reviews.create (rating 0 -> BAD_REQUEST)",
      () =>
        authed.reviews.create({
          productId: product.id,
          rating: 0,
          comment: "",
        }),
      "[BAD_REQUEST]"
    );

    await checkFails(
      "reviews.create (rating 6 -> BAD_REQUEST)",
      () =>
        authed.reviews.create({
          productId: product.id,
          rating: 6,
          comment: "",
        }),
      "[BAD_REQUEST]"
    );

    await checkFails(
      "reviews.create (unknown product -> NOT_FOUND)",
      () =>
        authed.reviews.create({
          productId: createId(),
          rating: 5,
          comment: "",
        }),
      "[NOT_FOUND]"
    );

    await checkFails(
      "reviews.list (unknown product -> NOT_FOUND)",
      () => anon.reviews.list({ productId: createId() }),
      "[NOT_FOUND]"
    );

    const otherUser = await db.user.create({
      data: {
        id: otherUserId,
        name: "API Check Two",
        email: `api-check-two-${otherUserId}@example.com`,
        emailVerified: true,
      },
    });
    const otherSessionRow = await db.session.create({
      data: {
        id: createId(),
        userId: otherUserId,
        token: createId(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const otherAuthed = createCaller(
      () =>
        ({
          db,
          session: { user: otherUser, session: otherSessionRow },
          headers: new Headers(),
        }) as unknown as Ctx
    );

    await check(
      "reviews.create (second user reviews the same product)",
      async () => {
        const review = await otherAuthed.reviews.create({
          productId: product.id,
          rating: 4,
          comment: "Works well for the price.",
        });
        otherReviewId = review.id;
        return review;
      }
    );

    await checkFails(
      "reviews.delete (someone else's review -> FORBIDDEN)",
      () => authed.reviews.delete({ reviewId: otherReviewId }),
      "[FORBIDDEN]"
    );

    await checkFails(
      "reviews.delete (unknown id -> NOT_FOUND)",
      () => authed.reviews.delete({ reviewId: createId() }),
      "[NOT_FOUND]"
    );

    await check("reviews.delete (removes own review)", () =>
      authed.reviews.delete({ reviewId: myReviewId })
    );

    await check("reviews.list (own review gone, other's remains)", async () => {
      const out = await anon.reviews.list({ productId: product.id });
      if (out.reviews.some((r) => r.userId === userId)) {
        throw new Error("the deleted review is still listed");
      }
      if (!out.reviews.some((r) => r.userId === otherUserId)) {
        throw new Error("the second user's review went missing");
      }
      return out;
    });

    // ---- orders: checkout lifecycle ---------------------------------------
    const shippingInfo = {
      fullName: "API Check",
      phone: "9800000000",
      email: "api-check@example.com",
      province: "Bagmati",
      city: "Kathmandu",
      address: "Verification Tole 12, Baneshwor",
      note: "Leave at the gate",
    };

    await checkFails(
      "orders.create (empty items -> BAD_REQUEST)",
      () =>
        authed.orders.create({
          items: [],
          shippingInfo,
          paymentMethod: "COD",
        }),
      "[BAD_REQUEST]"
    );

    await checkFails(
      "orders.create (unknown SKU -> NOT_FOUND)",
      () =>
        authed.orders.create({
          items: [{ skuId: createId(), quantity: 1 }],
          shippingInfo,
          paymentMethod: "COD",
        }),
      "[NOT_FOUND]"
    );

    if (skuWithStock.stock < 99) {
      await checkFails(
        "orders.create (quantity > stock -> PRECONDITION_FAILED)",
        () =>
          authed.orders.create({
            items: [
              { skuId: skuWithStock.id, quantity: skuWithStock.stock + 1 },
            ],
            shippingInfo,
            paymentMethod: "COD",
          }),
        "[PRECONDITION_FAILED]"
      );
    }

    let codOrderId = "";
    await check("orders.create (COD, wire-safe totals)", async () => {
      await authed.cart.addToCart({ skuId: skuWithStock.id, quantity: 1 });

      const wire = overTheWire(
        await authed.orders.create({
          items: [{ skuId: skuWithStock.id, quantity: 1 }],
          shippingInfo,
          paymentMethod: "COD",
        })
      );
      codOrderId = wire.id;
      createdOrderIds.push(wire.id);

      if (wire.status !== "PENDING") {
        throw new Error(`status ${wire.status}, want PENDING`);
      }
      if (wire.paymentMethod !== "COD") {
        throw new Error(`paymentMethod ${wire.paymentMethod}, want COD`);
      }
      if (typeof wire.totalAmount !== "number") {
        throw new Error(
          `totalAmount came through as ${typeof wire.totalAmount}, want number`
        );
      }
      const expected = Number(skuWithStock.price);
      if (wire.totalAmount !== expected) {
        throw new Error(
          `totalAmount ${wire.totalAmount}, want ${expected} (1 x price)`
        );
      }
      return wire;
    });

    await check(
      "orders.create (stock decremented by ordered qty)",
      async () => {
        const row = await db.productSKU.findUnique({
          where: { id: skuWithStock.id },
          select: { stock: true },
        });
        if (!row || row.stock !== stockBefore - 1) {
          throw new Error(`stock ${row?.stock}, want ${stockBefore - 1}`);
        }
        return row;
      }
    );

    await check(
      "orders.create (clears the ordered line from the cart)",
      async () => {
        const items = await authed.cart.getCartItems();
        if (items.some((line) => line.skuId === skuWithStock.id)) {
          throw new Error("the ordered SKU is still in the cart");
        }
        return items;
      }
    );

    await check("orders.list (includes the caller's own order)", async () => {
      const orders = await authed.orders.list({});
      if (!orders.some((order) => order.id === codOrderId)) {
        throw new Error("own order missing from list");
      }
      return orders;
    });

    await checkFails(
      "orders.getById (anonymous on a user order -> FORBIDDEN)",
      () => anon.orders.getById({ orderId: codOrderId }),
      "[FORBIDDEN]"
    );

    await checkFails(
      "orders.completePayment (COD order -> BAD_REQUEST)",
      () => authed.orders.completePayment({ orderId: codOrderId }),
      "[BAD_REQUEST]"
    );

    let esewaOrderId = "";
    await check("orders.create (eSewa)", async () => {
      const order = await authed.orders.create({
        items: [{ skuId: skuWithStock.id, quantity: 1 }],
        shippingInfo,
        paymentMethod: "ESEWA",
      });
      esewaOrderId = order.id;
      createdOrderIds.push(order.id);
      if (order.paymentMethod !== "ESEWA") {
        throw new Error(`paymentMethod ${order.paymentMethod}, want ESEWA`);
      }
      return order;
    });

    await checkFails(
      "orders.completePayment (anonymous -> FORBIDDEN)",
      () => anon.orders.completePayment({ orderId: esewaOrderId }),
      "[FORBIDDEN]"
    );

    await checkFails(
      "orders.completePayment (eSewa -> BAD_REQUEST, real flow)",
      () =>
        authed.orders.completePayment({
          orderId: esewaOrderId,
          walletNumber: "9800000000",
        }),
      "[BAD_REQUEST]"
    );

    await checkFails(
      "orders.verifyEsewaPayment (never initiated -> BAD_REQUEST)",
      () => authed.orders.verifyEsewaPayment({ orderId: esewaOrderId }),
      "[BAD_REQUEST]"
    );

    await check(
      "orders.initiateEsewaPayment (returns signed eSewa form)",
      async () => {
        const wire = overTheWire(
          await authed.orders.initiateEsewaPayment({
            orderId: esewaOrderId,
          })
        );
        if (!wire.url.includes("esewa.com.np")) {
          throw new Error(`url ${wire.url}, want an eSewa payment endpoint`);
        }
        const required = [
          "amount",
          "tax_amount",
          "total_amount",
          "transaction_uuid",
          "product_code",
          "product_service_charge",
          "product_delivery_charge",
          "success_url",
          "failure_url",
          "signed_field_names",
          "signature",
        ];
        for (const key of required) {
          if (typeof wire.fields[key] !== "string" || wire.fields[key] === "") {
            throw new Error(`field ${key} missing or empty`);
          }
        }
        const expectedTotal = Number(skuWithStock.price).toFixed(2);
        if (wire.fields.total_amount !== expectedTotal) {
          throw new Error(
            `total_amount ${wire.fields.total_amount}, want ${expectedTotal}`
          );
        }
        if (!wire.fields.success_url.includes("/api/payments/esewa/success")) {
          throw new Error(`success_url ${wire.fields.success_url} is wrong`);
        }
        if (!wire.fields.failure_url.includes("/checkout/payment-failed")) {
          throw new Error(`failure_url ${wire.fields.failure_url} is wrong`);
        }
        return wire;
      }
    );

    await check(
      "orders.initiateEsewaPayment (unique transaction_uuid per attempt)",
      async () => {
        const first = await authed.orders.initiateEsewaPayment({
          orderId: esewaOrderId,
        });
        const second = await authed.orders.initiateEsewaPayment({
          orderId: esewaOrderId,
        });
        if (first.fields.transaction_uuid === second.fields.transaction_uuid) {
          throw new Error("transaction_uuid must be unique per initiation");
        }
        return second;
      }
    );

    let guestOrderId = "";
    await check("orders.create (guest order, userId null)", async () => {
      const order = await anon.orders.create({
        items: [{ skuId: skuWithStock.id, quantity: 1 }],
        shippingInfo,
        paymentMethod: "KHALTI",
      });
      guestOrderId = order.id;
      createdOrderIds.push(order.id);
      if (order.userId !== null) {
        throw new Error(`userId ${order.userId}, want null`);
      }
      return order;
    });

    await check("orders.list (guest device sees its own order)", async () => {
      const orders = await anon.orders.list({ orderIds: [guestOrderId] });
      if (!orders.some((order) => order.id === guestOrderId)) {
        throw new Error("guest order missing from list");
      }
      return orders;
    });

    await check("orders.list (anonymous without ids -> empty)", async () => {
      const orders = await anon.orders.list({});
      if (orders.length !== 0) {
        throw new Error(`got ${orders.length} orders, want 0`);
      }
      return orders;
    });

    await check("orders.getById (guest order readable by id)", () =>
      anon.orders.getById({ orderId: guestOrderId })
    );

    await check("orders.completePayment (guest Khalti -> PAID)", async () => {
      const wire = await anon.orders.completePayment({
        orderId: guestOrderId,
        walletNumber: "9800000000",
      });
      if (wire.status !== "PAID") {
        throw new Error(`status ${wire.status}, want PAID`);
      }
      if (
        typeof wire.paymentRef !== "string" ||
        !wire.paymentRef.startsWith("KHALT-")
      ) {
        throw new Error(`paymentRef ${wire.paymentRef}, want KHALT- prefix`);
      }
      return wire;
    });
  } finally {
    await db.order.deleteMany({
      where: { id: { in: createdOrderIds } },
    });
    await db.productSKU.update({
      where: { id: skuWithStock.id },
      data: { stock: stockBefore },
    });
    await db.user.deleteMany({
      where: { id: { in: [userId, otherUserId] } },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const width = Math.max(...rows.map((r) => r.name.length));
    for (const row of rows) {
      const status = row.ok ? "PASS" : "FAIL";
      const detail = row.detail ? `  — ${row.detail}` : "";
      console.log(`${status}  ${row.name.padEnd(width)}${detail}`);
    }
    const failed = rows.filter((r) => !r.ok);
    console.log(`\n${rows.length - failed.length}/${rows.length} passed`);
    if (failed.length > 0) {
      process.exitCode = 1;
    }
    await db.$disconnect();
  });
