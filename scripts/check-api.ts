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

import "./admin-env";
import { createHmac } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import SuperJSON from "superjson";
import {
  GET as checkoutGet,
  POST as checkoutPost,
} from "@/app/api/checkout-session/route";
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

async function postCheckoutSession(body: unknown) {
  const response = await checkoutPost(
    new Request("http://localhost/api/checkout-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return { response, body: (await response.json()) as Record<string, any> };
}

async function getCheckoutSession(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const response = await checkoutGet(
    new Request(`http://localhost/api/checkout-session?${query}`)
  );
  return { response, body: (await response.json()) as Record<string, any> };
}

function base64Json(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf-8").toString("base64");
}

/** Route handler must answer with `wantStatus` (and optional body.status). */
async function checkHttp(
  name: string,
  run: () => Promise<{ response: Response; body: Record<string, any> }>,
  wantStatus: number,
  wantBodyStatus?: string
) {
  await check(name, async () => {
    const { response, body } = await run();
    if (response.status !== wantStatus) {
      throw new Error(
        `HTTP ${response.status} (${JSON.stringify(body)}), want ${wantStatus}`
      );
    }
    if (wantBodyStatus !== undefined && body.status !== wantBodyStatus) {
      throw new Error(`body.status ${body.status}, want ${wantBodyStatus}`);
    }
    return body;
  });
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

  // The check account must match an entry in ADMIN_EMAILS (see admin-env.ts).
  const adminEmail = "api-check-admin@example.com";
  await db.user.deleteMany({ where: { email: adminEmail } });
  const adminUser = await db.user.create({
    data: {
      id: createId(),
      name: "API Check Admin",
      email: adminEmail,
      emailVerified: true,
    },
  });
  const adminSessionRow = await db.session.create({
    data: {
      id: createId(),
      userId: adminUser.id,
      token: createId(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const admin = createCaller(
    () =>
      ({
        db,
        session: { user: adminUser, session: adminSessionRow },
        headers: new Headers(),
      }) as unknown as Ctx
  );

  let adminCategoryId = "";
  let adminProductId = "";
  let soloProductId = "";
  let greenSkuId = "";
  let soloSkuId = "";

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
    // ---- saved addresses (address router) -----------------------------------
    await checkFails(
      "address.list (anonymous -> UNAUTHORIZED)",
      () => anon.address.list(),
      "[UNAUTHORIZED]"
    );
    await checkFails(
      "address.create (anonymous -> UNAUTHORIZED)",
      () =>
        anon.address.create({
          province: "Bagmati",
          city: "Kathmandu",
          address: "Anonymous attempt Ward 5",
        }),
      "[UNAUTHORIZED]"
    );

    let savedAddressId = "";
    await check("address.create (stores a saved address)", async () => {
      const out = await authed.address.create({
        fullName: "API Check",
        phone: "9800000000",
        province: "Bagmati",
        city: "Kathmandu",
        address: "Verification Tole 12, Baneshwor",
        lat: 27.7172,
        lng: 85.324,
      });
      savedAddressId = out.id;
      if (out.lat !== 27.7172 || out.lng !== 85.324) {
        throw new Error(`coords ${out.lat},${out.lng}, want 27.7172,85.324`);
      }
      return out;
    });

    await check(
      "address.list (returns the caller's saved addresses)",
      async () => {
        const out = await authed.address.list();
        if (!out.some((address) => address.id === savedAddressId)) {
          throw new Error("saved address missing from the list");
        }
        return out;
      }
    );

    await checkFails(
      "address.create (invalid province -> BAD_REQUEST)",
      () =>
        authed.address.create({
          province: "Nowhere",
          city: "Kathmandu",
          address: "Bad province Ward 5",
        }),
      "[BAD_REQUEST]"
    );

    await check(
      "address.create (refreshes a duplicate location instead of stacking)",
      async () => {
        const out = await authed.address.create({
          fullName: "API Check Renamed",
          province: "Bagmati",
          city: "Kathmandu",
          address: "Verification Tole 12, Baneshwor",
        });
        if (out.id !== savedAddressId) {
          throw new Error(
            `created ${out.id}, want to refresh ${savedAddressId}`
          );
        }
        if (out.fullName !== "API Check Renamed") {
          throw new Error(`fullName ${out.fullName}, want the update applied`);
        }
        return out;
      }
    );

    await check("address.create (caps saved addresses at 5)", async () => {
      let attempts = 0;
      while (attempts < 30) {
        try {
          await authed.address.create({
            province: "Bagmati",
            city: "Kathmandu",
            address: `Bulk saved address ${attempts} Ward 5`,
          });
        } catch (error) {
          const capped =
            error instanceof Error &&
            (error as { code?: unknown }).code === "PRECONDITION_FAILED";
          if (!capped) {
            throw error;
          }
          break;
        }
        attempts++;
      }
      const saved = await db.address.count({ where: { userId } });
      if (saved !== 5) {
        throw new Error(`saved ${saved} addresses, want the cap at 5`);
      }
      return saved;
    });

    await check("address.remove (deletes the caller's address)", async () => {
      const out = await authed.address.remove({ id: savedAddressId });
      if (out.id !== savedAddressId) {
        throw new Error(`removed ${out.id}, want ${savedAddressId}`);
      }
      const after = await authed.address.list();
      if (after.some((address) => address.id === savedAddressId)) {
        throw new Error("address still present after removal");
      }
      return out;
    });

    await checkFails(
      "address.remove (unknown address -> NOT_FOUND)",
      () => authed.address.remove({ id: createId() }),
      "[NOT_FOUND]"
    );

    await checkFails(
      "address.remove (someone else's address -> FORBIDDEN)",
      async () => {
        const theirs = await otherAuthed.address.create({
          province: "Bagmati",
          city: "Kathmandu",
          address: "Other account address Ward 3",
        });
        return authed.address.remove({ id: theirs.id });
      },
      "[FORBIDDEN]"
    );

    const shippingInfo = {
      fullName: "API Check",
      phone: "9800000000",
      email: "api-check@example.com",
      province: "Bagmati",
      city: "Kathmandu",
      address: "Verification Tole 12, Baneshwor",
      note: "Leave at the gate",
      deliveryLat: 27.7172,
      deliveryLng: 85.324,
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
      const expectedSubtotal = Number(skuWithStock.price);
      if (wire.subtotal !== expectedSubtotal) {
        throw new Error(
          `subtotal ${wire.subtotal}, want ${expectedSubtotal} (1 x price)`
        );
      }
      // The delivery charge depends on the store's configured settings, so
      // assert the invariant instead: total = subtotal + delivery - discount,
      // all as wire-safe numbers.
      const recomputed =
        wire.subtotal + wire.deliveryCharge - wire.discountAmount;
      if (Math.abs(wire.totalAmount - recomputed) > 0.005) {
        throw new Error(
          `totalAmount ${wire.totalAmount}, want ~${recomputed} (subtotal + delivery - discount)`
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

    let guestCodOrderId = "";
    await check("orders.create (guest COD order)", async () => {
      const order = await anon.orders.create({
        items: [{ skuId: skuWithStock.id, quantity: 1 }],
        shippingInfo,
        paymentMethod: "COD",
      });
      guestCodOrderId = order.id;
      createdOrderIds.push(order.id);
      return order;
    });

    await checkHttp(
      "checkout-session POST (COD order -> BAD_REQUEST)",
      () => postCheckoutSession({ orderId: guestCodOrderId }),
      400,
      "error"
    );

    await check(
      "orders.list (signed-in caller sees own + guest orders)",
      async () => {
        const orders = await authed.orders.list({
          orderIds: [guestCodOrderId],
        });
        if (!orders.some((order) => order.id === codOrderId)) {
          throw new Error("own account order missing from list");
        }
        if (!orders.some((order) => order.id === guestCodOrderId)) {
          throw new Error("guest order missing for a signed-in caller");
        }
        return orders;
      }
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

    await checkHttp(
      "checkout-session POST (someone else's order -> FORBIDDEN)",
      () => postCheckoutSession({ orderId: esewaOrderId }),
      403,
      "error"
    );

    await checkHttp(
      "checkout-session GET (user order, no session -> reaches verification)",
      () => getCheckoutSession({ orderId: esewaOrderId }),
      400,
      "error"
    );

    let guestEsewaOrderId = "";
    await check("orders.create (guest eSewa order)", async () => {
      const order = await anon.orders.create({
        items: [{ skuId: skuWithStock.id, quantity: 1 }],
        shippingInfo,
        paymentMethod: "ESEWA",
      });
      guestEsewaOrderId = order.id;
      createdOrderIds.push(order.id);
      return order;
    });

    let firstEsewaUuid = "";
    await check(
      "checkout-session POST (eSewa -> HMAC-signed config)",
      async () => {
        const { response, body } = await postCheckoutSession({
          orderId: guestEsewaOrderId,
        });
        if (response.status !== 200 || body.status !== "success") {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
        }
        const config = body.esewaConfig;
        if (!config || typeof config.signature !== "string") {
          throw new Error("esewaConfig.signature missing");
        }
        const secretKey = process.env.ESEWA_SECRET_KEY;
        const merchantCode = process.env.ESEWA_MERCHANT_CODE;
        if (!secretKey || !merchantCode) {
          throw new Error("ESEWA_* vars are missing from .env");
        }
        if (config.product_code !== merchantCode) {
          throw new Error(`product_code ${config.product_code}`);
        }
        const signedMessage = `total_amount=${config.total_amount},transaction_uuid=${config.transaction_uuid},product_code=${config.product_code}`;
        const expected = createHmac("sha256", secretKey)
          .update(signedMessage)
          .digest("base64");
        if (config.signature !== expected) {
          throw new Error(`signature ${config.signature}, want ${expected}`);
        }
        if (typeof body.paymentUrl !== "string") {
          throw new Error("paymentUrl missing");
        }
        const row = await db.order.findUnique({
          where: { id: guestEsewaOrderId },
          select: { esewaTransactionUuid: true },
        });
        if (row?.esewaTransactionUuid !== config.transaction_uuid) {
          throw new Error("transaction uuid was not persisted on the order");
        }
        firstEsewaUuid = config.transaction_uuid;
        return body;
      }
    );

    await check(
      "checkout-session POST (eSewa retry issues a fresh uuid)",
      async () => {
        const { body } = await postCheckoutSession({
          orderId: guestEsewaOrderId,
        });
        const uuid = body.esewaConfig?.transaction_uuid;
        if (typeof uuid !== "string" || uuid === firstEsewaUuid) {
          throw new Error(
            `retry uuid ${uuid}, want a fresh one (issued ${firstEsewaUuid})`
          );
        }
        const row = await db.order.findUnique({
          where: { id: guestEsewaOrderId },
          select: { esewaTransactionUuid: true },
        });
        if (row?.esewaTransactionUuid !== uuid) {
          throw new Error("the fresh uuid was not persisted on the order");
        }
        firstEsewaUuid = uuid;
        return body;
      }
    );

    await checkHttp(
      "checkout-session GET (missing orderId -> 400)",
      () => getCheckoutSession({}),
      400,
      "error"
    );

    await checkHttp(
      "checkout-session GET (invalid eSewa payload -> 400)",
      () =>
        getCheckoutSession({
          orderId: guestEsewaOrderId,
          data: Buffer.from("not-json", "utf-8").toString("base64"),
        }),
      400,
      "error"
    );

    await checkHttp(
      "checkout-session GET (eSewa not COMPLETE -> pending)",
      () =>
        getCheckoutSession({
          orderId: guestEsewaOrderId,
          data: base64Json({
            status: "PENDING",
            transaction_uuid: "irrelevant",
            total_amount: "100",
          }),
        }),
      200,
      "pending"
    );

    await checkHttp(
      "checkout-session GET (foreign transaction uuid -> 400)",
      () =>
        getCheckoutSession({
          orderId: guestEsewaOrderId,
          data: base64Json({
            status: "COMPLETE",
            transaction_uuid: createId(),
            total_amount: "100",
            ref_id: "REF-1",
          }),
        }),
      400,
      "error"
    );

    await checkHttp(
      "checkout-session GET (amount mismatch -> 400)",
      async () => {
        const row = await db.order.findUnique({
          where: { id: guestEsewaOrderId },
          select: { esewaTransactionUuid: true },
        });
        return getCheckoutSession({
          orderId: guestEsewaOrderId,
          data: base64Json({
            status: "COMPLETE",
            transaction_uuid: row?.esewaTransactionUuid,
            total_amount: "1.00",
            ref_id: "REF-1",
          }),
        });
      },
      400,
      "error"
    );

    await check(
      "checkout-session GET (fabricated COMPLETE data stays unpaid)",
      async () => {
        const row = await db.order.findUnique({
          where: { id: guestEsewaOrderId },
          select: { esewaTransactionUuid: true, totalAmount: true },
        });
        if (!row?.esewaTransactionUuid) {
          throw new Error("transaction uuid missing on the order");
        }
        const { body } = await getCheckoutSession({
          orderId: guestEsewaOrderId,
          data: base64Json({
            status: "COMPLETE",
            transaction_uuid: row.esewaTransactionUuid,
            total_amount: String(row.totalAmount.toNumber()),
            ref_id: "REF-FABRICATED",
          }),
        });
        if (body.status === "success") {
          throw new Error("unverified data marked the order as paid");
        }
        const after = await db.order.findUnique({
          where: { id: guestEsewaOrderId },
          select: { status: true },
        });
        if (after?.status !== "PENDING") {
          throw new Error(
            `order moved to ${after?.status} without gateway confirmation`
          );
        }
        return body;
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

    await check(
      "checkout-session POST (Khalti initiate or not configured)",
      async () => {
        const { response, body } = await postCheckoutSession({
          orderId: guestOrderId,
        });
        if (response.ok) {
          if (typeof body.khaltiPaymentUrl !== "string") {
            throw new Error("khaltiPaymentUrl missing");
          }
          return body;
        }
        if (
          response.status === 503 &&
          typeof body.message === "string" &&
          body.message.includes("not configured")
        ) {
          return body;
        }
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
      }
    );

    await checkHttp(
      "checkout-session GET (Khalti return without pidx -> 400)",
      () => getCheckoutSession({ orderId: guestOrderId }),
      400,
      "error"
    );

    await check(
      "checkout-session GET (fake Khalti pidx stays unpaid)",
      async () => {
        const { body } = await getCheckoutSession({
          orderId: guestOrderId,
          pidx: `fake-${createId()}`,
        });
        if (body.status === "success") {
          throw new Error("an unverified pidx marked the order as paid");
        }
        return body;
      }
    );

    await check(
      "admin.updateOrderStatus (guest eSewa order -> PAID)",
      async () => {
        const out = await admin.admin.updateOrderStatus({
          orderId: guestEsewaOrderId,
          status: "PAID",
        });
        if (out.status !== "PAID" || !out.paidAt) {
          throw new Error(`status ${out.status}, paidAt ${out.paidAt}`);
        }
        return out;
      }
    );

    await checkHttp(
      "checkout-session GET (already PAID order -> idempotent success)",
      () => getCheckoutSession({ orderId: guestEsewaOrderId }),
      200,
      "success"
    );

    await check("admin.updateOrderStatus (eSewa order -> PAID)", async () => {
      const out = await admin.admin.updateOrderStatus({
        orderId: esewaOrderId,
        status: "PAID",
      });
      if (out.status !== "PAID" || !out.paidAt) {
        throw new Error(`status ${out.status}, paidAt ${out.paidAt}`);
      }
      return out;
    });

    // ---- admin panel: authorization ---------------------------------------
    await checkFails(
      "admin.check (anonymous -> UNAUTHORIZED)",
      () => anon.admin.check(),
      "[UNAUTHORIZED]"
    );

    await check("admin.check (regular user -> not an admin)", async () => {
      const out = await authed.admin.check();
      if (out.isAdmin) {
        throw new Error("a regular user must not be reported as an admin");
      }
      return out;
    });

    await checkFails(
      "admin.stats (regular user -> FORBIDDEN)",
      () => authed.admin.stats(),
      "[FORBIDDEN]"
    );

    await checkFails(
      "admin.createProduct (regular user -> FORBIDDEN)",
      () =>
        authed.admin.createProduct({
          name: "Forbidden Product",
          slug: "forbidden-product",
          description: "A regular user must never be able to create products.",
          categoryId: product.category.id,
          baseImage: "https://placehold.co/600x400?text=forbidden",
          isPublished: false,
          skus: [{ sku: `FORBIDDEN-${userId}`, price: 10, stock: 1 }],
        }),
      "[FORBIDDEN]"
    );

    await checkFails(
      "admin.listOrders (anonymous -> UNAUTHORIZED)",
      () => anon.admin.listOrders({}),
      "[UNAUTHORIZED]"
    );

    await check("admin.check (admin -> isAdmin true)", async () => {
      const out = await admin.admin.check();
      if (!out.isAdmin) {
        throw new Error("the allow-listed account was not recognized");
      }
      return out;
    });

    await check("admin.stats", async () => {
      const stats = await admin.admin.stats();
      if (stats.products.total < 1) {
        throw new Error("expected at least one product in the catalog");
      }
      if (
        stats.products.drafts !==
        stats.products.total - stats.products.published
      ) {
        throw new Error("draft/published counts do not add up");
      }
      if (typeof stats.orders.revenue !== "number") {
        throw new Error(
          `revenue came through as ${typeof stats.orders.revenue}`
        );
      }
      if (stats.customers < 1) {
        throw new Error("expected at least one customer");
      }
      return stats;
    });

    // ---- admin panel: categories ------------------------------------------
    const categorySeed = createId();
    const adminCategoryName = `API Check Category ${categorySeed}`;

    await check("admin.createCategory", async () => {
      const category = await admin.admin.createCategory({
        name: adminCategoryName,
        description: "Temporary category from the API verification script.",
      });
      adminCategoryId = category.id;
      if (!category.slug) {
        throw new Error("slug missing on the created category");
      }
      return category;
    });

    await checkFails(
      "admin.createCategory (duplicate name -> BAD_REQUEST)",
      () =>
        admin.admin.createCategory({
          name: adminCategoryName,
          description: "Same name twice must collide on the derived slug.",
        }),
      "exists"
    );

    await check("admin.listCategories (seeded + created)", async () => {
      const categories = await admin.admin.listCategories();
      if (!categories.some((row) => row.id === adminCategoryId)) {
        throw new Error("the created category is missing");
      }
      if (!categories.some((row) => row.id === product.category.id)) {
        throw new Error("a seeded category is missing");
      }
      return categories;
    });

    // ---- admin panel: product + SKU lifecycle ------------------------------
    const suffix = createId();
    const widgetSlug = `api-check-widget-${suffix}`;
    const redCode = `APICHECK-${suffix}-RED`;
    const blueCode = `APICHECK-${suffix}-BLUE`;
    const greenCode = `APICHECK-${suffix}-GREEN`;
    const imageA = "https://placehold.co/600x400?text=api-check-a";
    const imageB = "https://placehold.co/600x400?text=api-check-b";
    const imageC = "https://placehold.co/600x400?text=api-check-c";

    await check("admin.createProduct (options + per-SKU images)", async () => {
      const created = await admin.admin.createProduct({
        name: "API Check Widget",
        slug: widgetSlug,
        description:
          "Throwaway product created by the API verification script.",
        categoryId: adminCategoryId,
        baseImage: imageA,
        isPublished: false,
        skus: [
          {
            sku: redCode,
            price: 100,
            stock: 5,
            optionValues: [{ name: "Color", value: "Red" }],
          },
          {
            sku: blueCode,
            price: 120,
            originalPrice: 150,
            stock: 3,
            imageUrl: imageB,
            optionValues: [{ name: "Color", value: "Blue" }],
          },
        ],
      });
      adminProductId = created.id;
      if (created.slug !== widgetSlug) {
        throw new Error(`slug ${created.slug}, want ${widgetSlug}`);
      }
      return created;
    });

    await check(
      "admin.getProduct (baseImage + SKU image fallback)",
      async () => {
        const wire = overTheWire(
          await admin.admin.getProduct({ productId: adminProductId })
        );
        if (wire.baseImage !== imageA) {
          throw new Error(`baseImage ${wire.baseImage}, want ${imageA}`);
        }
        if (wire.options.length !== 1 || wire.options[0].name !== "Color") {
          throw new Error("expected one derived option named Color");
        }
        const values = wire.options[0].values.map((row) => row.value).join(",");
        if (values !== "Blue,Red") {
          throw new Error(`option values ${values}, want Blue,Red`);
        }
        if (wire.productSKUs.length !== 2) {
          throw new Error(`expected 2 SKUs, got ${wire.productSKUs.length}`);
        }
        const red = wire.productSKUs.find((row) => row.sku === redCode);
        const blue = wire.productSKUs.find((row) => row.sku === blueCode);
        if (!red || !blue) {
          throw new Error("a created SKU is missing from the product");
        }
        if (red.imageUrl !== imageA) {
          throw new Error(
            `SKU without an image has ${red.imageUrl}, want fallback to baseImage`
          );
        }
        if (blue.imageUrl !== imageB) {
          throw new Error(`SKU image ${blue.imageUrl}, want ${imageB}`);
        }
        if (typeof red.price !== "number" || typeof blue.price !== "number") {
          throw new Error("prices did not survive the wire format");
        }
        if (red.labels[0] !== "Color: Red") {
          throw new Error(`labels ${red.labels.join(", ")}, want Color: Red`);
        }
        return wire;
      }
    );

    await checkFails(
      "admin.createProduct (duplicate slug -> friendly BAD_REQUEST)",
      () =>
        admin.admin.createProduct({
          name: "API Check Widget Clone",
          slug: widgetSlug,
          description: "Second product that must collide on the slug check.",
          categoryId: adminCategoryId,
          baseImage: imageA,
          isPublished: false,
          skus: [{ sku: `APICHECK-${suffix}-DUP`, price: 10, stock: 1 }],
        }),
      "slug"
    );

    await checkFails(
      "admin.createProduct (unknown category -> NOT_FOUND)",
      () =>
        admin.admin.createProduct({
          name: "API Check Orphan",
          slug: `api-check-orphan-${suffix}`,
          description: "Points at a category id that does not exist.",
          categoryId: createId(),
          baseImage: imageA,
          isPublished: false,
          skus: [{ sku: `APICHECK-${suffix}-ORPHAN`, price: 10, stock: 1 }],
        }),
      "[NOT_FOUND]"
    );

    await check("admin.listProducts (search + summary)", async () => {
      const out = await admin.admin.listProducts({
        search: "API Check Widget",
      });
      const row = out.products.find((entry) => entry.id === adminProductId);
      if (!row) {
        throw new Error("the created product is missing from the list");
      }
      if (row.skuCount !== 2 || row.totalStock !== 8) {
        throw new Error(
          `skuCount ${row.skuCount}, totalStock ${row.totalStock}, want 2/8`
        );
      }
      if (row.minPrice !== 100) {
        throw new Error(`minPrice ${row.minPrice}, want 100`);
      }
      if (row.isPublished) {
        throw new Error("the product was created as a draft");
      }
      return out;
    });

    await check(
      "admin.createSku (new option value + image fallback)",
      async () => {
        const sku = await admin.admin.createSku({
          productId: adminProductId,
          sku: greenCode,
          price: 90,
          stock: 2,
          newValues: [{ name: "Color", value: "Green" }],
        });
        greenSkuId = sku.id;
        if (sku.imageUrl !== imageA) {
          throw new Error(
            `image ${sku.imageUrl}, want fallback to baseImage ${imageA}`
          );
        }
        if (!sku.labels.includes("Color: Green")) {
          throw new Error(`labels ${sku.labels.join(", ")}, want Color: Green`);
        }
        if (typeof sku.price !== "number") {
          throw new Error(`price came through as ${typeof sku.price}`);
        }
        return sku;
      }
    );

    await checkFails(
      "admin.createSku (existing combination -> BAD_REQUEST)",
      () =>
        admin.admin.createSku({
          productId: adminProductId,
          sku: `APICHECK-${suffix}-RED2`,
          price: 80,
          stock: 1,
          newValues: [{ name: "Color", value: "Red" }],
        }),
      "combination"
    );

    await checkFails(
      "admin.createSku (unknown option value id -> BAD_REQUEST)",
      () =>
        admin.admin.createSku({
          productId: adminProductId,
          sku: `APICHECK-${suffix}-X1`,
          price: 80,
          stock: 1,
          optionValueIds: [createId()],
        }),
      "does not exist"
    );

    await checkFails(
      "admin.createSku (unknown option name -> BAD_REQUEST)",
      () =>
        admin.admin.createSku({
          productId: adminProductId,
          sku: `APICHECK-${suffix}-X2`,
          price: 80,
          stock: 1,
          newValues: [{ name: "Size", value: "M" }],
        }),
      "no option named"
    );

    await checkFails(
      "admin.createSku (duplicate SKU code -> BAD_REQUEST)",
      () =>
        admin.admin.createSku({
          productId: adminProductId,
          sku: redCode,
          price: 80,
          stock: 1,
          newValues: [{ name: "Color", value: "Navy" }],
        }),
      "already in use"
    );

    await check("admin.updateSku (own image + numbers)", async () => {
      const updated = await admin.admin.updateSku({
        skuId: greenSkuId,
        sku: greenCode,
        price: 95,
        originalPrice: 110,
        stock: 6,
        imageUrl: imageC,
      });
      if (updated.imageUrl !== imageC) {
        throw new Error(`imageUrl ${updated.imageUrl}, want ${imageC}`);
      }
      if (updated.price !== 95 || updated.originalPrice !== 110) {
        throw new Error(
          `price/originalPrice ${updated.price}/${updated.originalPrice}, want 95/110`
        );
      }
      if (updated.stock !== 6) {
        throw new Error(`stock ${updated.stock}, want 6`);
      }
      return updated;
    });

    await check(
      "admin.updateSku (clearing the image falls back to baseImage)",
      async () => {
        const updated = await admin.admin.updateSku({
          skuId: greenSkuId,
          sku: greenCode,
          price: 95,
          originalPrice: 110,
          stock: 6,
          imageUrl: null,
        });
        if (updated.imageUrl !== imageA) {
          throw new Error(
            `imageUrl ${updated.imageUrl}, want fallback to ${imageA}`
          );
        }
        return updated;
      }
    );

    await checkFails(
      "admin.updateSku (duplicate code -> BAD_REQUEST)",
      () =>
        admin.admin.updateSku({
          skuId: greenSkuId,
          sku: blueCode,
          price: 95,
          stock: 6,
        }),
      "already in use"
    );

    await check("admin.deleteSku (removes the extra variant)", () =>
      admin.admin.deleteSku({ skuId: greenSkuId })
    );

    await checkFails(
      "admin.deleteSku (unknown id -> NOT_FOUND)",
      () => admin.admin.deleteSku({ skuId: createId() }),
      "[NOT_FOUND]"
    );

    const soloSlug = `api-check-solo-${suffix}`;
    const soloCode = `APICHECK-${suffix}-SOLO`;

    await check("admin.createProduct (optionless, single SKU)", async () => {
      const created = await admin.admin.createProduct({
        name: "API Check Solo",
        slug: soloSlug,
        description: "Product without options; it may only have one SKU.",
        categoryId: adminCategoryId,
        baseImage: imageA,
        isPublished: true,
        skus: [{ sku: soloCode, price: 50, stock: 4 }],
      });
      soloProductId = created.id;

      const detail = await admin.admin.getProduct({
        productId: soloProductId,
      });
      const solo = detail.productSKUs[0];
      if (!solo) {
        throw new Error("the optionless product has no SKU");
      }
      soloSkuId = solo.id;
      if (solo.imageUrl !== imageA) {
        throw new Error(
          `image ${solo.imageUrl}, want fallback to baseImage ${imageA}`
        );
      }
      return created;
    });

    await checkFails(
      "admin.createSku (optionless product rejects a second SKU)",
      () =>
        admin.admin.createSku({
          productId: soloProductId,
          sku: `APICHECK-${suffix}-SOLO2`,
          price: 50,
          stock: 1,
        }),
      "only have one SKU"
    );

    await checkFails(
      "admin.deleteSku (last SKU guarded)",
      () => admin.admin.deleteSku({ skuId: soloSkuId }),
      "at least one SKU"
    );

    await check(
      "admin.updateProduct (rename, baseImage, publish)",
      async () => {
        const updated = await admin.admin.updateProduct({
          productId: adminProductId,
          name: "API Check Widget v2",
          slug: widgetSlug,
          description: "Updated description for the throwaway check product.",
          categoryId: adminCategoryId,
          baseImage: imageB,
          isPublished: true,
        });
        if (updated.name !== "API Check Widget v2") {
          throw new Error(`name ${updated.name} was not saved`);
        }
        if (!updated.isPublished) {
          throw new Error("isPublished did not flip to true");
        }
        return updated;
      }
    );

    await checkFails(
      "admin.updateProduct (taken slug -> friendly BAD_REQUEST)",
      () =>
        admin.admin.updateProduct({
          productId: adminProductId,
          name: "API Check Widget v2",
          slug: product.slug,
          description: "Trying to steal the slug of a seeded product.",
          categoryId: adminCategoryId,
          baseImage: imageB,
          isPublished: true,
        }),
      "slug"
    );

    await check("admin.togglePublish (back to draft)", async () => {
      const flipped = await admin.admin.togglePublish({
        productId: adminProductId,
      });
      if (flipped.isPublished) {
        throw new Error("expected the product to become a draft");
      }
      return flipped;
    });

    await checkFails(
      "admin.getProduct (unknown id -> NOT_FOUND)",
      () => admin.admin.getProduct({ productId: createId() }),
      "[NOT_FOUND]"
    );

    // ---- admin panel: order listing + status transitions -------------------
    await check("admin.listOrders (sees every order)", async () => {
      const out = await admin.admin.listOrders({ limit: 50 });
      const own = out.orders.find((entry) => entry.id === codOrderId);
      if (!own) {
        throw new Error("the COD order is missing from the admin list");
      }
      if (typeof own.totalAmount !== "number") {
        throw new Error(
          `totalAmount came through as ${typeof own.totalAmount}`
        );
      }
      return out;
    });

    await check("admin.listOrders (status filter)", async () => {
      const out = await admin.admin.listOrders({
        status: "PENDING",
        limit: 50,
      });
      if (!out.orders.some((entry) => entry.id === codOrderId)) {
        throw new Error("the pending COD order is missing");
      }
      if (out.orders.some((entry) => entry.status !== "PENDING")) {
        throw new Error("the status filter returned another status");
      }
      return out;
    });

    await checkFails(
      "admin.updateOrderStatus (PENDING -> SHIPPED rejected)",
      () =>
        admin.admin.updateOrderStatus({
          orderId: codOrderId,
          status: "SHIPPED",
        }),
      "cannot move to"
    );

    await check(
      "admin.updateOrderStatus (same status is a no-op)",
      async () => {
        const out = await admin.admin.updateOrderStatus({
          orderId: codOrderId,
          status: "PENDING",
        });
        if (out.status !== "PENDING") {
          throw new Error(`status ${out.status}, want PENDING`);
        }
        return out;
      }
    );

    await check(
      "admin.updateOrderStatus (PENDING -> PAID sets paidAt)",
      async () => {
        const out = await admin.admin.updateOrderStatus({
          orderId: codOrderId,
          status: "PAID",
        });
        if (out.status !== "PAID") {
          throw new Error(`status ${out.status}, want PAID`);
        }
        if (!out.paidAt) {
          throw new Error("paidAt missing after entering PAID");
        }
        return out;
      }
    );

    await check(
      "admin.updateOrderStatus (PAID -> PROCESSING -> SHIPPED -> DELIVERED)",
      async () => {
        const processing = await admin.admin.updateOrderStatus({
          orderId: codOrderId,
          status: "PROCESSING",
        });
        const shipped = await admin.admin.updateOrderStatus({
          orderId: codOrderId,
          status: "SHIPPED",
        });
        const delivered = await admin.admin.updateOrderStatus({
          orderId: codOrderId,
          status: "DELIVERED",
        });
        if (
          processing.status !== "PROCESSING" ||
          shipped.status !== "SHIPPED" ||
          delivered.status !== "DELIVERED"
        ) {
          throw new Error("the status walk stopped early");
        }
        return delivered;
      }
    );

    await check(
      "admin.updateOrderStatus (DELIVERED -> REFUNDED restocks)",
      async () => {
        const before = await db.productSKU.findUnique({
          where: { id: skuWithStock.id },
          select: { stock: true },
        });
        const out = await admin.admin.updateOrderStatus({
          orderId: codOrderId,
          status: "REFUNDED",
        });
        const after = await db.productSKU.findUnique({
          where: { id: skuWithStock.id },
          select: { stock: true },
        });
        if (out.status !== "REFUNDED") {
          throw new Error(`status ${out.status}, want REFUNDED`);
        }
        if (!before || !after || after.stock !== before.stock + 1) {
          throw new Error(
            `stock ${before?.stock} -> ${after?.stock}, want +1 restock`
          );
        }
        return out;
      }
    );

    await checkFails(
      "admin.updateOrderStatus (REFUNDED -> PROCESSING rejected)",
      () =>
        admin.admin.updateOrderStatus({
          orderId: codOrderId,
          status: "PROCESSING",
        }),
      "cannot move to"
    );

    await checkFails(
      "admin.updateOrderStatus (PAID -> DELIVERED rejected)",
      () =>
        admin.admin.updateOrderStatus({
          orderId: esewaOrderId,
          status: "DELIVERED",
        }),
      "cannot move to"
    );

    await check(
      "admin.updateOrderStatus (PAID -> CANCELLED restocks)",
      async () => {
        const before = await db.productSKU.findUnique({
          where: { id: skuWithStock.id },
          select: { stock: true },
        });
        const out = await admin.admin.updateOrderStatus({
          orderId: esewaOrderId,
          status: "CANCELLED",
        });
        const after = await db.productSKU.findUnique({
          where: { id: skuWithStock.id },
          select: { stock: true },
        });
        if (out.status !== "CANCELLED") {
          throw new Error(`status ${out.status}, want CANCELLED`);
        }
        if (!before || !after || after.stock !== before.stock + 1) {
          throw new Error(
            `stock ${before?.stock} -> ${after?.stock}, want +1 restock`
          );
        }
        return out;
      }
    );

    await checkFails(
      "admin.updateOrderStatus (unknown order -> NOT_FOUND)",
      () =>
        admin.admin.updateOrderStatus({ orderId: createId(), status: "PAID" }),
      "[NOT_FOUND]"
    );

    // ---- refunds + customer cancellation -----------------------------------
    await check("orders.getById (refund visible to the customer)", async () => {
      // codOrderId ended REFUNDED above, which must carry a completed refund
      const out = await authed.orders.getById({ orderId: codOrderId });
      if (!out.refund) {
        throw new Error("the REFUNDED order has no refund row");
      }
      if (out.refund.status !== "REFUNDED") {
        throw new Error(`refund status ${out.refund.status}, want REFUNDED`);
      }
      if (out.refund.amount !== out.totalAmount) {
        throw new Error(
          `refund ${out.refund.amount} != paid ${out.totalAmount}`
        );
      }
      return out.refund;
    });

    await check(
      "admin.updateRefundStatus (PENDING -> PROCESSING -> REFUNDED)",
      async () => {
        // esewaOrderId was cancelled while paid, so it opened a pending refund
        const processing = await admin.admin.updateRefundStatus({
          orderId: esewaOrderId,
          status: "PROCESSING",
        });
        if (processing.status !== "PROCESSING") {
          throw new Error(`status ${processing.status}, want PROCESSING`);
        }
        const done = await admin.admin.updateRefundStatus({
          orderId: esewaOrderId,
          status: "REFUNDED",
        });
        if (done.status !== "REFUNDED") {
          throw new Error(`status ${done.status}, want REFUNDED`);
        }
        if (typeof done.amount !== "number" || done.amount <= 0) {
          throw new Error(`refund amount came back as ${done.amount}`);
        }
        return done;
      }
    );

    await checkFails(
      "admin.updateRefundStatus (REFUNDED -> PENDING rejected)",
      () =>
        admin.admin.updateRefundStatus({
          orderId: esewaOrderId,
          status: "PENDING",
        }),
      "cannot move from"
    );

    await checkFails(
      "admin.updateRefundStatus (unknown order -> NOT_FOUND)",
      () =>
        admin.admin.updateRefundStatus({
          orderId: createId(),
          status: "PENDING",
        }),
      "[NOT_FOUND]"
    );

    let unpaidOrderId = "";
    await check(
      "orders.changePaymentMethod (unpaid order switches methods)",
      async () => {
        const order = await authed.orders.create({
          items: [{ skuId: skuWithStock.id, quantity: 1 }],
          shippingInfo,
          paymentMethod: "ESEWA",
        });
        unpaidOrderId = order.id;
        createdOrderIds.push(order.id);

        const cod = await authed.orders.changePaymentMethod({
          orderId: order.id,
          paymentMethod: "COD",
        });
        const khalti = await authed.orders.changePaymentMethod({
          orderId: order.id,
          paymentMethod: "KHALTI",
        });
        if (cod.paymentMethod !== "COD") {
          throw new Error(`method ${cod.paymentMethod}, want COD`);
        }
        if (khalti.paymentMethod !== "KHALTI") {
          throw new Error(`method ${khalti.paymentMethod}, want KHALTI`);
        }
        if (khalti.paidAt !== null) {
          throw new Error("switching methods must not mark an order paid");
        }
        return khalti;
      }
    );

    await checkFails(
      "orders.changePaymentMethod (paid order -> BAD_REQUEST)",
      () =>
        authed.orders.changePaymentMethod({
          orderId: esewaOrderId,
          paymentMethod: "COD",
        }),
      "[BAD_REQUEST]"
    );

    await checkFails(
      "orders.changePaymentMethod (someone else's order -> FORBIDDEN)",
      () =>
        otherAuthed.orders.changePaymentMethod({
          orderId: unpaidOrderId,
          paymentMethod: "COD",
        }),
      "[FORBIDDEN]"
    );

    await check(
      "orders.cancel (unpaid order -> CANCELLED, no refund)",
      async () => {
        const out = await authed.orders.cancel({ orderId: unpaidOrderId });
        if (out.status !== "CANCELLED") {
          throw new Error(`status ${out.status}, want CANCELLED`);
        }
        if (out.refund !== null) {
          throw new Error("an unpaid order must not open a refund");
        }
        return out;
      }
    );

    await checkFails(
      "orders.cancel (already cancelled -> BAD_REQUEST)",
      () => authed.orders.cancel({ orderId: unpaidOrderId }),
      "[BAD_REQUEST]"
    );

    await checkFails(
      "orders.cancel (someone else's order -> FORBIDDEN)",
      () => otherAuthed.orders.cancel({ orderId: codOrderId }),
      "[FORBIDDEN]"
    );

    await check(
      "orders.cancel (guest order, cancelled by id possession)",
      async () => {
        const out = await anon.orders.cancel({ orderId: guestOrderId });
        if (out.status !== "CANCELLED") {
          throw new Error(`status ${out.status}, want CANCELLED`);
        }
        if (out.refund !== null) {
          throw new Error("an unpaid guest order must not open a refund");
        }
        return out;
      }
    );

    await check(
      "orders.cancel (paid order -> CANCELLED + pending refund)",
      async () => {
        const order = await authed.orders.create({
          items: [{ skuId: skuWithStock.id, quantity: 1 }],
          shippingInfo,
          paymentMethod: "ESEWA",
        });
        createdOrderIds.push(order.id);
        await admin.admin.updateOrderStatus({
          orderId: order.id,
          status: "PAID",
        });

        const out = await authed.orders.cancel({ orderId: order.id });
        if (out.status !== "CANCELLED") {
          throw new Error(`status ${out.status}, want CANCELLED`);
        }
        if (!out.refund) {
          throw new Error("cancelling a paid order must open a refund");
        }
        if (out.refund.status !== "PENDING") {
          throw new Error(`refund ${out.refund.status}, want PENDING`);
        }
        if (out.refund.amount !== out.totalAmount) {
          throw new Error(
            `refund ${out.refund.amount} != paid ${out.totalAmount}`
          );
        }
        return out;
      }
    );

    await checkFails(
      "orders.cancel (shipped order -> BAD_REQUEST)",
      async () => {
        const order = await authed.orders.create({
          items: [{ skuId: skuWithStock.id, quantity: 1 }],
          shippingInfo,
          paymentMethod: "COD",
        });
        createdOrderIds.push(order.id);
        await admin.admin.updateOrderStatus({
          orderId: order.id,
          status: "PAID",
        });
        await admin.admin.updateOrderStatus({
          orderId: order.id,
          status: "PROCESSING",
        });
        await admin.admin.updateOrderStatus({
          orderId: order.id,
          status: "SHIPPED",
        });
        return authed.orders.cancel({ orderId: order.id });
      },
      "[BAD_REQUEST]"
    );

    await check("admin.sweepImages (unreferenced uploads)", async () => {
      const out = await admin.admin.sweepImages();
      if (typeof out.scanned !== "number" || typeof out.deleted !== "number") {
        throw new Error(`unexpected sweep result: ${JSON.stringify(out)}`);
      }
      if (out.deleted > out.scanned) {
        throw new Error(`deleted ${out.deleted} of ${out.scanned} scanned`);
      }
      return out;
    });
  } finally {
    await db.order.deleteMany({
      where: { id: { in: createdOrderIds } },
    });
    await db.productSKU.update({
      where: { id: skuWithStock.id },
      data: { stock: stockBefore },
    });
    await db.product.deleteMany({
      where: { id: { in: [adminProductId, soloProductId] } },
    });
    await db.category.deleteMany({ where: { id: adminCategoryId } });
    await db.user.deleteMany({
      where: { id: { in: [userId, otherUserId, adminUser.id] } },
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
