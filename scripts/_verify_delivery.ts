// biome-ignore-all lint: dev script
/**
 * End-to-end verification of the delivery feature against the real database,
 * using the same in-process tRPC caller as scripts/check-api.ts.
 *
 *   bun scripts/_verify_delivery.ts
 *
 * Covers: settings persistence + validation, server-side distance/charge math
 * (computed independently in this script), tamper resistance, snapshot
 * immutability, free-delivery fallback, delivery-men CRUD, assignment and
 * status transitions, the widened ASSIGNED payment gate, revenue equivalence,
 * and SuperJSON wire round-trips. Everything it creates is removed and the
 * store settings row is restored to its original state at the end.
 *
 * Exits non-zero if any check fails.
 */

import "./admin-env";
import { createId } from "@paralleldrive/cuid2";
import SuperJSON from "superjson";
import { GET as checkoutGet } from "@/app/api/checkout-session/route";
import { quoteDelivery } from "@/lib/delivery";
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

function overTheWire<T>(value: T): T {
  return SuperJSON.parse(SuperJSON.stringify(value)) as T;
}

function expectEqual(name: string, actual: unknown, expected: unknown) {
  const ok = Object.is(actual, expected);
  rows.push({
    name,
    ok,
    detail: ok
      ? undefined
      : `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`,
  });
}

function expectClose(name: string, actual: unknown, expected: number) {
  const ok = typeof actual === "number" && Math.abs(actual - expected) < 1e-9;
  rows.push({
    name,
    ok,
    detail: ok ? undefined : `got ${JSON.stringify(actual)}, want ${expected}`,
  });
}

/** Independent great-circle implementation — not the shared lib. */
function independentHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;
const round2 = (value: number) => Math.round(value * 100) / 100;

const STORE = { lat: 27.7065, lng: 85.319 };
const CUSTOMER = { lat: 27.7172, lng: 85.324 };
const RATE_A = 25;
const RATE_B = 40;

function shippingInfo(lat: number, lng: number) {
  return {
    fullName: "Delivery Verify",
    phone: "9800000000",
    email: "delivery-verify@example.com",
    province: "Bagmati",
    city: "Lalitpur",
    address: "Verification Tole 7, Kumaripati",
    note: "Charge verification",
    deliveryLat: lat,
    deliveryLng: lng,
  };
}

async function getDbOrder(id: string) {
  const order = await db.order.findUnique({ where: { id } });
  if (!order) {
    throw new Error(`order ${id} vanished`);
  }
  return order;
}

async function main() {
  // ---- fixtures ----------------------------------------------------------
  const sku = await db.productSKU.findFirst({
    where: { stock: { gte: 5 } },
    orderBy: { price: "asc" },
  });
  if (!sku) {
    throw new Error("no SKU with stock >= 5 — run: bun seed.ts");
  }
  const stockSnapshot = await db.productSKU.findUnique({
    where: { id: sku.id },
    select: { stock: true },
  });
  const stockBefore = stockSnapshot?.stock ?? 0;

  const originalSetting = await db.storeSetting.findUnique({
    where: { id: "main" },
  });

  const createdOrderIds: string[] = [];
  const createdManIds: string[] = [];
  const adminEmail = "api-check-admin@example.com";
  const linkEmail = "delivery-link-check@example.com";

  try {
    const anon = createCaller(
      () => ({ db, session: null, headers: new Headers() }) satisfies Ctx
    );

    await db.user.deleteMany({ where: { email: adminEmail } });
    const adminUser = await db.user.create({
      data: {
        id: createId(),
        name: "API Check Admin",
        email: adminEmail,
        emailVerified: true,
      },
    });
    const adminSession = await db.session.create({
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
          session: { user: adminUser, session: adminSession },
          headers: new Headers(),
        }) as unknown as Ctx
    );

    await db.user.deleteMany({ where: { email: linkEmail } });

    // ---- delivery settings -------------------------------------------------
    await check("admin.delivery.getSettings (baseline)", () =>
      admin.admin.delivery.getSettings()
    );

    await check(
      "admin.delivery.updateSettings (save store + rate)",
      async () => {
        const saved = await admin.admin.delivery.updateSettings({
          storeLat: STORE.lat,
          storeLng: STORE.lng,
          deliveryRatePerKm: RATE_A,
        });
        expectEqual("  saved latitude", saved.storeLat, STORE.lat);
        expectEqual("  saved rate", saved.deliveryRatePerKm, RATE_A);
        return saved;
      }
    );

    await check("admin.delivery.getSettings (persisted)", async () => {
      const settings = await admin.admin.delivery.getSettings();
      expectEqual("  latitude", settings.storeLat, STORE.lat);
      expectEqual("  longitude", settings.storeLng, STORE.lng);
      expectEqual("  rate", settings.deliveryRatePerKm, RATE_A);
      return settings;
    });

    await check("delivery.getSettings (public, configured)", async () => {
      const settings = await anon.delivery.getSettings();
      expectEqual("  configured", settings.configured, true);
      expectEqual("  rate", settings.ratePerKm, RATE_A);
      return settings;
    });

    await checkFails(
      "admin.delivery.updateSettings (latitude out of range -> BAD_REQUEST)",
      () =>
        admin.admin.delivery.updateSettings({
          storeLat: 95,
          storeLng: STORE.lng,
          deliveryRatePerKm: RATE_A,
        }),
      "[BAD_REQUEST]"
    );

    await checkFails(
      "admin.delivery.updateSettings (unpaired coordinates -> BAD_REQUEST)",
      () =>
        admin.admin.delivery.updateSettings({
          storeLat: 20,
          storeLng: null,
          deliveryRatePerKm: RATE_A,
        }),
      "[BAD_REQUEST]"
    );

    await checkFails(
      "admin.delivery.updateSettings (negative rate -> BAD_REQUEST)",
      () =>
        admin.admin.delivery.updateSettings({
          storeLat: STORE.lat,
          storeLng: STORE.lng,
          deliveryRatePerKm: -1,
        }),
      "[BAD_REQUEST]"
    );

    // ---- order creation: math + tamper resistance --------------------------
    const tamperPayload = {
      items: [{ skuId: sku.id, quantity: 1 }],
      shippingInfo: shippingInfo(CUSTOMER.lat, CUSTOMER.lng),
      paymentMethod: "COD",
      deliveryCharge: 999999,
      totalAmount: 1,
      subtotal: 0,
      storeLat: 12.34,
    } as Parameters<typeof anon.orders.create>[0];

    const order1 = (await check(
      "orders.create (tampered charge/total ignored)",
      () => anon.orders.create(tamperPayload)
    )) as { id: string } | undefined;

    if (!order1) {
      throw new Error("order1 was not created — aborting");
    }
    createdOrderIds.push(order1.id);

    await check("order1 snapshot matches independent math", async () => {
      const order = await getDbOrder(order1.id);
      const distance = round3(
        independentHaversine(STORE.lat, STORE.lng, CUSTOMER.lat, CUSTOMER.lng)
      );
      const charge = round2(distance * RATE_A);
      const subtotal = Number(order.subtotal);

      expectClose("  subtotal (price x qty)", subtotal, Number(sku.price) * 1);
      expectClose(
        "  delivery distance",
        Number(order.deliveryDistanceKm),
        distance
      );
      expectEqual(
        "  delivery rate snapshot",
        Number(order.deliveryRatePerKm),
        RATE_A
      );
      expectClose("  delivery charge", Number(order.deliveryCharge), charge);
      expectClose("  store latitude snapshot", order.storeLat, STORE.lat);
      expectClose("  store longitude snapshot", order.storeLng, STORE.lng);
      expectEqual("  discount", Number(order.discountAmount), 0);
      expectClose(
        "  total = subtotal + charge",
        Number(order.totalAmount),
        round2(subtotal + charge)
      );
      expectEqual("  status", order.status, "PENDING");
      expectEqual("  paidAt null before payment", order.paidAt, null);
      return order;
    });

    await check("checkout preview equals server snapshot", () => {
      const preview = quoteDelivery({
        store: STORE,
        customer: CUSTOMER,
        ratePerKm: RATE_A,
      });
      return (async () => {
        const order = await getDbOrder(order1.id);
        expectClose(
          "  preview distance = stored distance",
          preview.distanceKm,
          Number(order.deliveryDistanceKm)
        );
        expectClose(
          "  preview charge = stored charge",
          preview.deliveryCharge,
          Number(order.deliveryCharge)
        );
        return preview;
      })();
    });

    await check(
      "admin.listOrders serializes delivery snapshot (wire)",
      async () => {
        const wire = overTheWire(await admin.admin.listOrders({ limit: 100 }));
        const row = wire.orders.find((entry) => entry.id === order1.id);
        if (!row) {
          throw new Error("order1 missing from admin list");
        }
        if (typeof row.deliveryCharge !== "number") {
          throw new Error("deliveryCharge not serialized as number");
        }
        if (typeof row.subtotal !== "number") {
          throw new Error("subtotal not serialized as number");
        }
        if (row.deliveryMan !== null) {
          throw new Error("deliveryMan should be null before assignment");
        }
        if (typeof row.shippingInfo.deliveryLat !== "number") {
          throw new Error("customer latitude not serialized");
        }
        if (row.deliveryCharge <= 0) {
          throw new Error("expected a positive delivery charge");
        }
        return row;
      }
    );

    await check(
      "orders.list (guest) serializes delivery fields (wire)",
      async () => {
        const wire = overTheWire(
          await anon.orders.list({ orderIds: [order1.id] })
        );
        const row = wire.find((entry) => entry.id === order1.id);
        if (!row) {
          throw new Error("order1 missing from guest list");
        }
        if (typeof row.deliveryCharge !== "number") {
          throw new Error("deliveryCharge not serialized as number");
        }
        if (typeof row.subtotal !== "number") {
          throw new Error("subtotal not serialized as number");
        }
        if (typeof row.totalAmount !== "number") {
          throw new Error("totalAmount not serialized as number");
        }
        return row;
      }
    );

    // ---- snapshot immutability --------------------------------------------
    await check("settings change does not alter order1", async () => {
      const before = await getDbOrder(order1.id);
      await admin.admin.delivery.updateSettings({
        storeLat: 27.6,
        storeLng: 85.2,
        deliveryRatePerKm: RATE_B,
      });
      const after = await getDbOrder(order1.id);
      expectEqual(
        "  charge unchanged",
        Number(after.deliveryCharge),
        Number(before.deliveryCharge)
      );
      expectClose(
        "  rate snapshot unchanged",
        Number(after.deliveryRatePerKm),
        RATE_A
      );
      expectClose("  store snapshot unchanged", after.storeLat, STORE.lat);
      expectEqual(
        "  total unchanged",
        Number(after.totalAmount),
        Number(before.totalAmount)
      );
      return after;
    });

    const order2 = (await check(
      "orders.create after settings change uses the new quote",
      async () => {
        const created = await anon.orders.create({
          items: [{ skuId: sku.id, quantity: 1 }],
          shippingInfo: shippingInfo(CUSTOMER.lat, CUSTOMER.lng),
          paymentMethod: "COD",
        });
        createdOrderIds.push(created.id);
        const order = await getDbOrder(created.id);
        const distance = round3(
          independentHaversine(27.6, 85.2, CUSTOMER.lat, CUSTOMER.lng)
        );
        const charge = round2(distance * RATE_B);
        expectClose(
          "  new distance",
          Number(order.deliveryDistanceKm),
          distance
        );
        expectClose("  new rate", Number(order.deliveryRatePerKm), RATE_B);
        expectClose("  new charge", Number(order.deliveryCharge), charge);
        expectClose("  new store snapshot", order.storeLat, 27.6);
        const order1Row = await getDbOrder(order1.id);
        if (Number(order.deliveryCharge) === Number(order1Row.deliveryCharge)) {
          throw new Error("charge did not change with the rate");
        }
        return created;
      }
    )) as { id: string } | undefined;

    if (!order2) {
      throw new Error("order2 was not created — aborting");
    }

    // ---- free delivery -----------------------------------------------------
    await check(
      "clearing settings makes public config report free",
      async () => {
        await admin.admin.delivery.updateSettings({
          storeLat: null,
          storeLng: null,
          deliveryRatePerKm: null,
        });
        const settings = await anon.delivery.getSettings();
        expectEqual("  configured", settings.configured, false);
        return settings;
      }
    );

    await check(
      "orders.create with unconfigured store is free and unblocked",
      async () => {
        const created = await anon.orders.create({
          items: [{ skuId: sku.id, quantity: 1 }],
          shippingInfo: shippingInfo(CUSTOMER.lat, CUSTOMER.lng),
          paymentMethod: "COD",
        });
        createdOrderIds.push(created.id);
        const order = await getDbOrder(created.id);
        expectClose("  charge is zero", Number(order.deliveryCharge), 0);
        expectEqual("  distance is null", order.deliveryDistanceKm, null);
        expectEqual("  rate is null", order.deliveryRatePerKm, null);
        expectEqual("  store is null", order.storeLat, null);
        expectClose(
          "  total = subtotal",
          Number(order.totalAmount),
          Number(order.subtotal)
        );
        return created;
      }
    );

    // ---- delivery men CRUD -------------------------------------------------
    const man1 = (await check("admin.delivery.createMan (valid)", async () => {
      const id = await admin.admin.delivery.createMan({
        name: "Bagha Jethalal",
        phone: "9811111111",
        accountEmail: null,
      });
      createdManIds.push(id);
      return { id };
    })) as { id: string } | undefined;

    if (!man1) {
      throw new Error("man1 was not created — aborting");
    }

    await checkFails(
      "admin.delivery.createMan (bad phone -> BAD_REQUEST)",
      () =>
        admin.admin.delivery.createMan({
          name: "Bad Phone",
          phone: "abc",
          accountEmail: null,
        }),
      "[BAD_REQUEST]"
    );

    await checkFails(
      "admin.delivery.createMan (unknown account -> BAD_REQUEST)",
      () =>
        admin.admin.delivery.createMan({
          name: "Ghost",
          phone: "9822222222",
          accountEmail: "nobody@example.com",
        }),
      "[BAD_REQUEST]"
    );

    const linkUser = await db.user.create({
      data: {
        id: createId(),
        name: "Delivery Link",
        email: linkEmail,
        emailVerified: true,
      },
    });

    const man2 = (await check(
      "admin.delivery.createMan (linked to account)",
      async () => {
        const id = await admin.admin.delivery.createMan({
          name: "Roshan Sodhi",
          phone: "9833333333",
          accountEmail: linkEmail,
        });
        createdManIds.push(id);
        const men = await admin.admin.delivery.listMen();
        const row = men.find((entry) => entry.id === id);
        if (row?.accountEmail !== linkEmail) {
          throw new Error(
            `accountEmail ${row?.accountEmail}, want ${linkEmail}`
          );
        }
        return { id };
      }
    )) as { id: string } | undefined;

    if (!man2) {
      throw new Error("man2 was not created — aborting");
    }

    await checkFails(
      "admin.delivery.createMan (account already linked -> BAD_REQUEST)",
      () =>
        admin.admin.delivery.createMan({
          name: "Duplicate Link",
          phone: "9844444444",
          accountEmail: linkEmail,
        }),
      "[BAD_REQUEST]"
    );

    await check(
      "admin.delivery.updateMan (rename + relink is a no-op)",
      async () => {
        await admin.admin.delivery.updateMan({
          id: man1.id,
          name: "Bagha",
          phone: "9811111111",
          accountEmail: null,
        });
        const men = await admin.admin.delivery.listMen();
        const row = men.find((entry) => entry.id === man1.id);
        if (row?.name !== "Bagha") {
          throw new Error(`name ${row?.name}, want Bagha`);
        }
        if (men.length < 2) {
          throw new Error(
            `expected at least 2 delivery men, got ${men.length}`
          );
        }
        return men;
      }
    );

    await check(
      "admin.delivery.setActive (deactivate / reactivate)",
      async () => {
        const off = await admin.admin.delivery.setActive({
          id: man1.id,
          isActive: false,
        });
        expectEqual("  deactivated", off.isActive, false);
        const on = await admin.admin.delivery.setActive({
          id: man1.id,
          isActive: true,
        });
        expectEqual("  reactivated", on.isActive, true);
        return on;
      }
    );

    await checkFails(
      "admin.delivery.setActive (unknown man -> NOT_FOUND)",
      () => admin.admin.delivery.setActive({ id: createId(), isActive: false }),
      "[NOT_FOUND]"
    );

    // ---- assignment + status walk -----------------------------------------
    await admin.admin.delivery.setActive({ id: man1.id, isActive: false });

    await checkFails(
      "admin.delivery.assign (inactive man -> BAD_REQUEST)",
      () =>
        admin.admin.delivery.assign({
          orderId: order1.id,
          deliveryManId: man1.id,
        }),
      "[BAD_REQUEST]"
    );

    await admin.admin.delivery.setActive({ id: man1.id, isActive: true });

    await check(
      "admin.delivery.assign advances PENDING -> ASSIGNED",
      async () => {
        const out = await admin.admin.delivery.assign({
          orderId: order1.id,
          deliveryManId: man1.id,
        });
        expectEqual("  status", out.status, "ASSIGNED");
        expectEqual("  delivery man", out.deliveryManId, man1.id);
        const order = await getDbOrder(order1.id);
        expectEqual("  paidAt still null for unpaid COD", order.paidAt, null);
        return out;
      }
    );

    await check("admin.delivery.assign replaces the delivery man", async () => {
      const out = await admin.admin.delivery.assign({
        orderId: order1.id,
        deliveryManId: man2.id,
      });
      expectEqual("  delivery man replaced", out.deliveryManId, man2.id);
      expectEqual("  status stays ASSIGNED", out.status, "ASSIGNED");
      return out;
    });

    await check(
      "admin.delivery.assign with null clears the assignment",
      async () => {
        const out = await admin.admin.delivery.assign({
          orderId: order1.id,
          deliveryManId: null,
        });
        expectEqual("  delivery man cleared", out.deliveryManId, null);
        expectEqual("  status unchanged", out.status, "ASSIGNED");
        // re-assign for the remaining walk
        await admin.admin.delivery.assign({
          orderId: order1.id,
          deliveryManId: man2.id,
        });
        return out;
      }
    );

    await check(
      "status walk ASSIGNED -> OUT_FOR_DELIVERY -> DELIVERED",
      async () => {
        const mid = await admin.admin.updateOrderStatus({
          orderId: order1.id,
          status: "OUT_FOR_DELIVERY",
        });
        expectEqual("  mid status", mid.status, "OUT_FOR_DELIVERY");
        const done = await admin.admin.updateOrderStatus({
          orderId: order1.id,
          status: "DELIVERED",
        });
        expectEqual("  final status", done.status, "DELIVERED");
        const order = await getDbOrder(order1.id);
        if (order.paidAt === null) {
          throw new Error("paidAt should be set when COD reaches DELIVERED");
        }
        return done;
      }
    );

    await checkFails(
      "admin.updateOrderStatus (DELIVERED -> PROCESSING rejected)",
      () =>
        admin.admin.updateOrderStatus({
          orderId: order1.id,
          status: "PROCESSING",
        }),
      "[BAD_REQUEST]"
    );

    await checkFails(
      "admin.delivery.assign (DELIVERED order -> BAD_REQUEST)",
      () =>
        admin.admin.delivery.assign({
          orderId: order1.id,
          deliveryManId: man1.id,
        }),
      "[BAD_REQUEST]"
    );

    await check("admin.updateOrderStatus (PENDING -> CANCELLED)", async () => {
      const out = await admin.admin.updateOrderStatus({
        orderId: order2.id,
        status: "CANCELLED",
      });
      expectEqual("  status", out.status, "CANCELLED");
      return out;
    });

    await checkFails(
      "admin.delivery.assign (CANCELLED order -> BAD_REQUEST)",
      () =>
        admin.admin.delivery.assign({
          orderId: order2.id,
          deliveryManId: man1.id,
        }),
      "[BAD_REQUEST]"
    );

    await checkFails(
      "admin.delivery.deleteMan (with orders -> CONFLICT)",
      () => admin.admin.delivery.deleteMan({ id: man2.id }),
      "[CONFLICT]"
    );

    // ---- payment gate: ASSIGNED online order ------------------------------
    const order4 = (await check(
      "orders.create (eSewa) for the payment gate",
      async () => {
        const created = await anon.orders.create({
          items: [{ skuId: sku.id, quantity: 1 }],
          shippingInfo: shippingInfo(CUSTOMER.lat, CUSTOMER.lng),
          paymentMethod: "ESEWA",
        });
        createdOrderIds.push(created.id);
        return created;
      }
    )) as { id: string } | undefined;

    if (!order4) {
      throw new Error("order4 was not created — aborting");
    }

    await check(
      "assign an eSewa order before payment (PENDING -> ASSIGNED)",
      async () => {
        const out = await admin.admin.delivery.assign({
          orderId: order4.id,
          deliveryManId: man1.id,
        });
        expectEqual("  status", out.status, "ASSIGNED");
        return out;
      }
    );

    await check(
      "checkout-session GET on ASSIGNED unpaid order passes the pay gate",
      async () => {
        const response = await checkoutGet(
          new Request(
            `http://localhost/api/checkout-session?orderId=${order4.id}`
          )
        );
        const text = await response.text();
        if (text.includes("no longer be paid")) {
          throw new Error(`gate still blocks ASSIGNED orders: ${text}`);
        }
        return { status: response.status, body: text.slice(0, 120) };
      }
    );

    await check(
      "control: GET on a CANCELLED order is still blocked",
      async () => {
        await admin.admin.updateOrderStatus({
          orderId: order4.id,
          status: "CANCELLED",
        });
        const response = await checkoutGet(
          new Request(
            `http://localhost/api/checkout-session?orderId=${order4.id}`
          )
        );
        const text = await response.text();
        if (!text.includes("no longer be paid")) {
          throw new Error(`expected the status gate, got: ${text}`);
        }
        return { status: response.status };
      }
    );

    // ---- revenue equivalence ----------------------------------------------
    await check(
      "admin.stats revenue matches paidAt-based aggregate",
      async () => {
        const stats = await admin.admin.stats();
        const fresh = await db.order.aggregate({
          where: {
            paidAt: { not: null },
            status: { notIn: ["CANCELLED", "REFUNDED"] },
          },
          _sum: { totalAmount: true },
          _count: true,
        });
        expectClose(
          "  stats revenue",
          stats.orders.revenue,
          Number(fresh._sum.totalAmount ?? 0)
        );

        const legacy = await db.order.aggregate({
          where: {
            status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
          },
          _sum: { totalAmount: true },
          _count: true,
        });
        expectClose(
          "  legacy aggregate equals new aggregate (no regression)",
          Number(legacy._sum.totalAmount ?? 0),
          Number(fresh._sum.totalAmount ?? 0)
        );
        expectEqual(
          "  legacy count equals new count",
          legacy._count,
          fresh._count
        );
        expectEqual(
          "  byStatus includes new statuses",
          "ASSIGNED" in stats.orders.byStatus &&
            "OUT_FOR_DELIVERY" in stats.orders.byStatus,
          true
        );
        return stats.orders;
      }
    );
  } finally {
    // ---- cleanup: restore everything this script touched -----------------
    try {
      await db.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
      await db.productSKU.update({
        where: { id: sku.id },
        data: { stock: stockBefore },
      });
      await db.deliveryMan.deleteMany({
        where: { id: { in: createdManIds } },
      });
      await db.user.deleteMany({
        where: { email: { in: [adminEmail, linkEmail] } },
      });
      if (originalSetting) {
        await db.storeSetting.upsert({
          where: { id: "main" },
          create: {
            id: "main",
            storeLat: originalSetting.storeLat,
            storeLng: originalSetting.storeLng,
            deliveryRatePerKm: originalSetting.deliveryRatePerKm,
          },
          update: {
            storeLat: originalSetting.storeLat,
            storeLng: originalSetting.storeLng,
            deliveryRatePerKm: originalSetting.deliveryRatePerKm,
          },
        });
      } else {
        await db.storeSetting.deleteMany({ where: { id: "main" } });
      }
      const stockAfter = await db.productSKU.findUnique({
        where: { id: sku.id },
        select: { stock: true },
      });
      const leftoverOrders = await db.order.count({
        where: { id: { in: createdOrderIds } },
      });
      console.log(
        `cleanup: orders_left=${leftoverOrders} stock=${stockAfter?.stock} (want ${stockBefore}) settings_restored=${originalSetting ? "updated" : "deleted"}`
      );
    } catch (error) {
      console.error("cleanup failed:", error);
      process.exitCode = 1;
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const width = Math.max(...rows.map((row) => row.name.length));
    for (const row of rows) {
      const status = row.ok ? "PASS" : "FAIL";
      const detail = row.detail ? `  — ${row.detail}` : "";
      console.log(`${status}  ${row.name.padEnd(width)}${detail}`);
    }
    const failed = rows.filter((row) => !row.ok);
    console.log(`\n${rows.length - failed.length}/${rows.length} passed`);
    if (failed.length > 0) {
      process.exitCode = 1;
    }
    await db.$disconnect();
  });
