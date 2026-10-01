# Gada Electronics

An e-commerce storefront and admin back office for an electronics retailer, built with
Next.js 16 (App Router) on React 19, with a tRPC 11 API, Prisma 7 against PostgreSQL,
and `better-auth` for authentication.

The shop sells products organised into categories, each product having variants
(options → values → SKUs) with their own price, stock and image. Customers browse,
search, manage a cart, check out with a saved address, pay with cash on delivery,
eSewa or Khalti, and track their orders. Staff sign in to an admin area to manage
the catalogue, orders, delivery staff, refunds, customers and store settings.

---

## Table of contents

- [Stack](#stack)
- [Requirements](#requirements)
- [Environment variables](#environment-variables)
- [Getting started](#getting-started)
- [Commands](#commands)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [Pages](#pages)
  - [Storefront](#storefront)
  - [Auth](#auth)
  - [Checkout & payment](#checkout--payment)
  - [Admin](#admin)
- [API](#api)
  - [HTTP routes](#http-routes)
  - [tRPC root procedures](#trpc-root-procedures)
  - [products](#trpc-products)
  - [cart](#trpc-cart)
  - [orders](#trpc-orders)
  - [reviews](#trpc-reviews)
  - [favorite](#trpc-favorite)
  - [address](#trpc-address)
  - [delivery](#trpc-delivery)
  - [admin](#trpc-admin)
- [How key features work](#how-key-features-work)
  - [Authentication & admin gating](#authentication--admin-gating)
  - [Cart: guest vs. signed-in](#cart-guest-vs-signed-in)
  - [Address detection & geocoding](#address-detection--geocoding)
  - [Delivery fee calculation](#delivery-fee-calculation)
  - [Payments (eSewa / Khalti)](#payments-esewa--khalti)
  - [Order lifecycle, cancellation & refunds](#order-lifecycle-cancellation--refunds)
  - [Image storage & cleanup](#image-storage--cleanup)
- [Verification](#verification)

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16.3 (App Router), React 19.2, React Compiler enabled |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (CSS-based config, no `tailwind.config`) |
| Components | shadcn/ui on `@base-ui/react` (v4, `base-vega` style) — 60 files in `src/components/ui` |
| API | tRPC 11 + `@tanstack/react-query` 5, `superjson` transformer |
| ORM | Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Database | PostgreSQL |
| Auth | `better-auth` — email/password + Google OAuth |
| Email | Resend (verification / transactional) |
| File uploads | UploadThing (`imageUploader` for products, `avatar` for users) |
| Charts | Recharts (admin revenue) |
| Local state | Zustand (guest cart + guest order ids) |
| Icons | lucide-react |
| Lint / format | Biome (via `ultracite`) — no ESLint, no Prettier |
| Package manager | bun |

---

## Requirements

- Node.js 20+ (bun recommended; the repo ships `bun.lock`)
- A PostgreSQL database (Neon in practice)
- Accounts/keys for: Google OAuth, Resend, UploadThing, and eSewa + Khalti if you
  want wallet payments enabled

---

## Environment variables

Validated at runtime by `@t3-oss/env-nextjs` in `src/config/env.ts`. Missing
required values fail the build; empty strings are treated as undefined.

### Required — server

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Session signing secret |
| `RESEND_API_KEY` | Transactional email |
| `GOOGLE_CLIENT_ID` | Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `UPLOADTHING_TOKEN` | UploadThing API token |
| `UPLOADTHING_SECRET_KEY` | UploadThing API secret |

### Optional — server

| Variable | Purpose |
|---|---|
| `ADMIN_EMAILS` | Comma-separated list of admin emails. **Unset means nobody is an admin.** |
| `ESEWA_MERCHANT_CODE` | eSewa merchant code (absent → the eSewa initiate route returns 503) |
| `ESEWA_SECRET_KEY` | eSewa signature key |
| `ESEWA_ENV` | `sandbox` \| `production` (defaults to sandbox) |
| `KHALTI_SECRET_KEY` | Khalti secret key |
| `KHALTI_ENV` | `sandbox` \| `production` (defaults to sandbox) |

### Required — client

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_BASE_URL` | Absolute app URL; used to build gateway success/failure redirect URLs |

There is no `.env.example`. Copy values from an existing `.env` or create one.

> **Geolocation note:** browsers only expose `navigator.geolocation` on a secure
> origin. Test "Use my location" over `localhost` or HTTPS — a plain
> `http://192.168.x.x:3000` LAN address can never resolve a position, and the app
> now detects this and says so instead of failing with a generic timeout.

---

## Getting started

```bash
bun install

# generate the Prisma client into src/generated/prisma (gitignored)
bun run db:generate

# apply migrations
bun run db:migrate

# seed 10 categories + 61 products, with real product photos
bun run seed

bun dev   # http://localhost:3000
```

Seeding is also how you get a usable catalogue: `src/lib/catalog.ts` holds the
product definitions and `src/lib/product-images.json` maps each product to a real
photo in `public/products/`. To re-fetch images from Wikimedia Commons + Openverse,
run `bun run seed:images` (i.e. `scripts/fetch-product-images.ts`).

---

## Commands

| Command | What it does |
|---|---|
| `bun dev` | Dev server |
| `bun run build` | Production build |
| `bun start` | Serve the production build |
| `bun run lint` | `biome lint .` |
| `bun run format` | `biome check --write .` |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run seed` | `bun seed.ts` — categories + products |
| `bun run seed:images` | Re-fetch product photos |
| `bun run check:api` | `scripts/check-api.ts` — exercises every tRPC procedure |
| `bun run db:generate` | Generate the Prisma client |
| `bun run db:migrate` | Create/apply a migration |
| `bun run db:studio` | Prisma Studio |

There is **no test suite** — no test runner, no test files. Verification is done
with the two scripts under [Verification](#verification).

---

## Project structure

```
src/
  app/                     App Router routes
    layout.tsx             root layout — fonts, Toaster, TopLoader, Providers
    (withnavbar)/          storefront: navbar + announcement bar + footer
    (auth)/                sign-in, sign-up, verify-email (no nav chrome)
    (minimal)/             gateway payment page (own chrome)
    admin/                 admin back office (own sidebar layout + gate)
    api/                   route handlers (auth, trpc, uploadthing, checkout-session)
  components/ui/           shadcn/ui primitives
  features/                feature-organised components
    admin/  auth/  cart/  checkout/  homepage/  orders/  products/
  hooks/                   use-cart, use-cart-skus, use-address-geocode, use-mobile
  lib/                     auth, prisma, env, delivery, geocode, schemas, email
  server/api/              tRPC routers + context/procedures
    root.ts                appRouter — the single API entry point
    trpc.ts                context, publicProcedure / protectedProcedure / adminProcedure
    routers/               one file per domain
  stores/                  Zustand stores (guest cart, guest order ids)
  __rpc/                   tRPC client provider, query client, server caller
  config/env.ts            environment variable validation
  generated/prisma/        generated client (gitignored)
prisma/schema.prisma       data model
scripts/                   check-api.ts, _verify_delivery.ts, image fetching, uploads
public/                    static assets, product images, payment logos
```

**Route groups.** `(withnavbar)`, `(auth)` and `(minimal)` are URL-invisible groups
that exist purely to pick a layout. Only `withnavbar` and `admin` have a layout;
`(auth)` and `(minimal)` inherit the root layout and render their own chrome.

**Feature organisation.** Components live under `src/features/<domain>/components`
rather than next to their route, so e.g. `SavedAddressPicker` is reusable from
checkout and orders alike.

---

## Data model

`prisma/schema.prisma`. Money is `Decimal(10,2)`, distances `Decimal(6,3)`.

### Auth

- **User** — `email` unique, `emailVerified`, optional `image`. Relations: sessions,
  accounts, cart, orders, addresses, reviews, favorites, `DeliveryMan` (optional).
- **Session** — `token` unique, `expiresAt`, `ipAddress`, `userAgent`. Cascade on user delete.
- **Account** — OAuth credentials or the password hash (`password` non-null means
  the account can change its password).
- **Verification** — email-verification / OTP state, indexed by identifier.

### Catalogue

- **Category** — `name`, `slug` unique.
- **Product** — `name`, `slug` unique, `description`, `baseImage`,
  `isPublished`, `archivedAt` (soft delete).
- **ProductOption** — e.g. "Colour", unique per `(productId, name)`.
- **ProductOptionValue** — e.g. "Black", belongs to an option.
- **ProductSKU** — a sellable variant: `sku` unique, `price`, `originalPrice`
  (for the strike-through), `stock`, `imageUrl`, many-to-many to option values.
  This is what the cart, orders and stock counts point at.

### Cart

- **Cart** — `userId` optional/unique, so guests can hold a server-side cart too.
- **CartItem** — unique `(cartId, skuId)`, `quantity`.

### Delivery & orders

- **StoreSetting** — singleton row with `id: "main"`. Holds `storeLat`, `storeLng`,
  `deliveryRatePerKm`. **Null means "not configured" → delivery is free.**
- **DeliveryMan** — `name`, `phone`, `isActive`, optional linked `userId`. Orders
  reference this; unassigning sets it null rather than deleting.
- **Order** — `status`, `totalAmount`, `paymentMethod`, `paidAt`, `paymentRef`,
  plus a **financial snapshot** (`subtotal`, `discountAmount`, `deliveryCharge`,
  `deliveryDistanceKm`, `deliveryRatePerKm`, `storeLat`, `storeLng`) so later
  settings changes never alter historical orders. `esewaTransactionUuid` and
  `khaltiPidx` are unique so a gateway receipt can never be replayed.
  `shippingInfo` is stored as JSON.
- **OrderItem** — snapshots `productName`, `skuCode`, `quantity`, `unitPrice`,
  `totalPrice`, so the order survives product edits. `skuId` is nullable and
  `onDelete: SetNull`.
- **Refund** — one per order (`orderId` unique), with `status`, `amount`, `reason`.
- **Favorite** — unique `(userId, productId)`.
- **Review** — 1–5 `rating` + `comment`, unique `(userId, productId)`.
- **Address** — a customer's saved delivery address: `fullName`, `phone`,
  `province`, `city`, `zone`, `address`, and **`lat`/`lng`** — the exact drop-off
  point captured when it was saved. Null coords mean "geocode it when picked".

### Enums

- **OrderStatus** — `PENDING`, `PAID`, `PROCESSING`, `ASSIGNED`, `OUT_FOR_DELIVERY`,
  `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`.
- **PaymentMethod** — `COD`, `ESEWA`, `KHALTI`.
- **RefundStatus** — `PENDING`, `PROCESSING`, `REFUNDED`, `FAILED`.

---

## Pages

### Storefront

Route group `(withnavbar)`. Layout runs `preventUnauthorized()`, which redirects a
logged-in-but-unverified user to `/verify-email`.

#### `/` — `src/app/(withnavbar)/page.tsx`

Server component. Calls `api.products.getHomeData` and renders, in order: `Hero`
(store image, "Shop now" → `/products`, "Browse categories" → `#categories`),
`UspStrip`, `CategoryGrid`, a "Top deals" `ProductSection`, `PromoBanners`, and a
"Popular picks" `ProductSection`.

#### `/products` — `products/page.tsx` + `features/products/components/product-list.tsx`

Server prefetches `products.getAllProducts` (cursor-paginated, `limit: 20`), the
client `ProductList` renders the grid with an `IntersectionObserver` infinite
scroll (8 skeleton cards while loading, spinner while fetching the next page).
Each `ProductCard` carries an add-to-cart button and a favourite toggle.

#### `/product/[slug]`

Server prefetches `products.getProductBySlug`, then a client `ProductClientPage`
loads `getProductBySlug` (suspense) and `getRelatedProducts`. Contains: breadcrumb,
`ProductGallery` (per-SKU image thumbnails + % OFF badge), title, category pill,
`ProductRatingSummary`, `StockBadge`, a buy box (price, strike-through original,
"You save NPR …"), `VariantChips`, a quantity stepper capped by stock,
`AddToCartButton`, a trust row (free delivery / 1-year warranty / 7-day returns /
COD), the description, and `ReviewsSection` (read, create, delete). Selecting a
variant combination resolves the matching SKU; without a match it falls back to the
cheapest SKU. Unknown slug → a "Product not found" state.

#### `/category/[slug]`

Server prefetches `products.getProductsByCategorySlug` (infinite). The client page
shows a "Showing category results for …" banner and the same infinite-scroll grid,
with a `SearchX` empty state.

#### `/search?input=…`

Server calls `notFound()` without `input`, prefetches `products.searchProduct`
(infinite), and the client renders the results grid. The search box itself lives in
the navbar `SearchBar`.

#### `/favorites`

Auth-gated (redirects to `/sign-in`). Server prefetches `favorite.list`; the client
renders a `PageShell` with an item count, a "Continue shopping" button, and either
the grid or a `PromptCard` empty state.

#### `/orders?new=<orderId>`

Thin server shell passing `newOrderId` to a 510-line client page. The client calls
`orders.list` — merging signed-in user orders with guest order ids kept in the
Zustand `order-store` — and renders expandable order cards with: item lines,
delivery address, `PaymentDetails`, `RefundDetails`, and a subtotal / delivery /
total breakdown. A dismissible `SuccessBanner` appears for a new order, and links to
`/checkout/pay/{id}` when payment is still pending. `CancelOrderDialog` and
`ChangePaymentDialog` (in `features/orders/components/order-actions.tsx`) call
`orders.cancel` and `orders.changePaymentMethod`, each gated on the order status.

#### `/checkout`

A single large client component (`src/app/(withnavbar)/checkout/page.tsx`) — the
most complex page in the app. react-hook-form + zod (`shippingInfoFormSchema`).
Combines `useCartSkus()` (`cart.getCartItems` + `products.getSKUsByIds`),
`delivery.getSettings`, `useOrderStore`, `useAddressGeocode`, and the
`SavedAddressPicker` / `SaveAddressRow` / `LocationBox` components. Shows a live
delivery quote, selects a payment method, places the order, then redirects to
`/orders?new=…` (COD) or `/checkout/pay/{id}` (wallets). The place-order button is
disabled while a geocode is in flight.

### Auth

Route group `(auth)` — no navbar, no footer, no layout of its own.

- **`/sign-in`** — redirects home if already signed in. Split card: logo, title,
  `<SignInForm>` (email/password + Google), link to `/sign-up`, and an
  `/auth_image.png` panel on desktop.
- **`/sign-up`** — mirrors sign-in with `<SignUpForm>` and `/auth_image2.jpg`.
- **`/verify-email`** — redirects to `/sign-in` without a session, `/` once
  verified. Shows the address, a spam-folder note, and `<ResendEmailButton>`.

### Checkout & payment

#### `/checkout/pay/[orderId]`

Route group `(minimal)` — its own full-screen chrome. Server prefetches
`orders.getById`; the client `PayClient` drives four phases: `init` → `redirecting`
→ `verifying` → `failed`. It calls `/api/checkout-session` with plain `fetch` (not
tRPC), redirects to the gateway, and comes back. Shows the amount due, the order
number, a "Pay Rs. …" button, a declined-payment notice, and
"Change payment method". If the order needs no payment it redirects to `/orders`.
Brand styling uses the **official** eSewa green and Khalti red with their real logos
in `public/payments/`.

### Admin

Route group `admin`. `src/app/admin/layout.tsx` redirects to `/sign-in` without a
session and to `/` for non-admins, then renders a collapsible sidebar + sticky
header.

- **`/admin`** — dashboard: `admin.stats` for revenue / orders / customers / AOV
  cards with month-over-month deltas, a 12-month `RevenueChart` (Recharts), a
  recent-orders table, and top products by units sold.
- **`/admin/orders`** — `OrdersTable` (latest 100, client-side search + status +
  gateway filters) with dialogs to assign a delivery man, change status, cancel, or
  inspect the order in full (including delivery distance, rate and coordinates, and
  the refund controls).
- **`/admin/products`** — `ProductsTable`: infinite list with search, category and
  status filters, a show-archived toggle, and archive / restore / delete.
- **`/admin/products/new`** and **`/admin/products/[id]`** / **`/admin/products/[id]/edit`** —
  the shared `ProductForm` in create and edit modes (SKU and option drafts,
  image upload-or-URL field, inline category creation).
- **`/admin/categories`** — `CategoriesTable` plus a create/edit dialog that
  auto-generates the slug.
- **`/admin/customers`** and **`/admin/customers/[id]`** — customer list
  (deferred search) and a detail view with orders, addresses and totals.
- **`/admin/delivery-men`** — `DeliveryMenTable` with add/edit, activate/deactivate
  and delete.
- **`/admin/settings`** — store details, payment gateway and notification tabs,
  plus `DeliverySettingsCard` (store coordinates + rate per km) and
  `ImageCleanupCard` (UploadThing storage usage and a sweep).

> A note on the admin area: several older components
> (`admin-dashboard.tsx`, `products-list.tsx`, `product-edit.tsx`,
> `product-create-form.tsx`, `orders-panel.tsx`, `category-create.tsx`,
> `admin-nav.tsx`) are still in `src/features/admin/components` but are **not
> imported by any route**. `/admin/products/[id]` still uses `product-edit.tsx`
> while `/admin/products/[id]/edit` uses the newer `product-form.tsx`.

---

## API

### HTTP routes

| Route | Methods | What it does |
|---|---|---|
| `/api/auth/[...all]` | GET, POST | `better-auth` handler — sign-in, sign-up, Google OAuth, session management |
| `/api/trpc/[trpc]` | GET, POST | tRPC transport; `superjson` transformer; error formatter includes `zodError` via `z.treeifyError` |
| `/api/uploadthing` | GET, POST | Two UploadThing routes (see below) |
| `/api/checkout-session` | POST, GET | eSewa/Khalti initiation and verification (see below) |

**UploadThing** (`src/app/api/uploadthing/core.ts`) defines two routes:
- `imageUploader` — 4 MB, 1 file, **admin only** (`isAdminEmail`, otherwise
  `UploadThingError`).
- `avatar` — 2 MB, 1 file, any signed-in user; on completion deletes the previous
  avatar file from storage.

**`/api/checkout-session`** — input is always `{ orderId: cuid2 }`.

`POST` initiates a payment. It builds a tRPC context, loads the order, then
rejects: missing order (404), an order belonging to another account (403), `COD`
(400), already `PAID` (400), or a status outside `PENDING`/`ASSIGNED` (400).
- **eSewa** — mints a fresh `transaction_uuid` (`${Date.now()}-${randomUUID()}`)
  and claims the order with `updateMany({ where: { paidAt: null } })`. eSewa
  rejects a uuid it has already seen, so every attempt gets a new one and only the
  latest is accepted. Signs `total_amount`, `transaction_uuid`, `product_code` with
  HMAC-SHA256 base64 and returns the payment endpoint + hidden-form fields.
- **Khalti** — POSTs to the initiate endpoint with `Authorization: Key …`, a 15 s
  timeout, `amount` in paisa, `purchase_order_id`, `purchase_order_name` from the
  first order item, and `customer_info` from `shippingInfo`.

`GET` verifies the gateway return. It deliberately **skips the session check** —
completion is proven by the gateway receipt bound to that order, so the return works
for guests and signed-in users alike. eSewa base64-decodes `data`, requires the uuid
to match the order's, re-checks the uuid is not reused by another order, compares
the amount, then independently re-verifies against the gateway's status endpoint.
Khalti takes `pidx` (falling back to `txnid`), checks `purchase_order_id`, calls
lookup, and requires a matching amount (±0.01) and a `Completed` state. Both then
run one atomic `updateMany` guarded on `status in [PENDING, ASSIGNED]` **and**
`paidAt: null`, so a receipt can never double-apply.

### tRPC root procedures

Defined in `src/server/api/root.ts`.

| Procedure | Access | What it does |
|---|---|---|
| `health` | public | `{ status: "OK", timestamp }` |
| `getActiveSessions` | protected | The user's sessions (token stripped) |
| `deleteSession` | protected | Revoke one session; `NOT_FOUND` if it isn't theirs |

### tRPC `products`

All public. `src/server/api/routers/product-router.ts`.

| Procedure | What it does |
|---|---|
| `getAllProducts` | Cursor-paginated catalogue (`limit`, `cursor`) |
| `getProductVariants` | Options, values and SKUs for one product |
| `getProductBySKU` | One SKU by its code |
| `getSKUsByIds` | Hydrate cart lines to full SKUs |
| `getProductBySlug` | Full product detail by slug |
| `getRelatedProducts` | Other products in the same category |
| `searchProduct` | Search, cursor-paginated |
| `getProductsByCategorySlug` | Products in a category, cursor-paginated |
| `getHomeData` | Home page bundle: categories, deals, popular, stats |

### tRPC `cart`

All protected. `src/server/api/routers/cart-router.ts`.

| Procedure | What it does |
|---|---|
| `getCartItems` | The user's cart lines |
| `createCart` | Create the user's cart row |
| `addToCart` | Add a SKU, merging with an existing line |
| `removeItem` | Remove one line |
| `removeAllItems` | Empty the cart |
| `updateQuantity` | Set a line's quantity (bounded by stock) |

### tRPC `orders`

`src/server/api/routers/order-router.ts` — helpers in `order-helpers.ts`.

| Procedure | Access | What it does |
|---|---|---|
| `create` | public | Place an order. Re-reads SKU prices, recomputes the delivery fee, re-checks and decrements stock atomically, snapshots totals |
| `getById` | public | One order |
| `list` | public | Orders by id list (merges the signed-in user's and the guest's stored ids) |
| `cancel` | public | Cancel if still cancellable; restocks and opens a refund when paid |
| `changePaymentMethod` | public | Swap payment method before payment completes |
| `getAllOrderIds` | protected | Every order id for the signed-in user |

Ownership: guest orders (`userId` null) are guarded by possession of the cuid2 id —
the same model used by `getById`, `list` and the payment routes.

### tRPC `reviews`

`src/server/api/routers/review-router.ts`.

| Procedure | Access | What it does |
|---|---|---|
| `list` | public | Reviews for a product, with the author's name |
| `create` | protected | Create or replace your own (unique per user+product) |
| `delete` | protected | Delete your own review |

### tRPC `favorite`

`src/server/api/routers/favorite-router.ts`.

| Procedure | Access | What it does |
|---|---|---|
| `toggle` | protected | Add or remove a favourite |
| `list` | protected | The user's favourite products |
| `check` | protected | Whether one product is favourited |

### tRPC `address`

Protected, capped at **5** saved addresses per user
(`MAX_SAVED_ADDRESSES`). `src/server/api/routers/address-router.ts`.

| Procedure | What it does |
|---|---|
| `list` | Saved addresses, newest first, with coordinates |
| `create` | Save an address (fails when the cap is hit; saving the same location refreshes the existing row) |
| `remove` | Delete one — `NOT_FOUND`/`FORBIDDEN` if it isn't yours |

### tRPC `delivery`

| Procedure | Access | What it does |
|---|---|---|
| `getSettings` | public | `{ configured, storeLat, storeLng, ratePerKm }` from the singleton `StoreSetting` row |

Used only for the checkout preview.

### tRPC `admin`

Every procedure requires `adminProcedure` except `check`. Split across
`admin-router.ts` (nested sub-routers) and `admin-flat.ts` (spread in as
`flatAdminProcedures`).

| Procedure | What it does |
|---|---|
| `admin.check` | `{ isAdmin }` for the signed-in user |
| `admin.stats` | Dashboard revenue / order / customer / AOV figures + 12-month series |
| `admin.storageUsage` | UploadThing storage usage |
| `admin.sweepImages` | Delete unreferenced uploaded images |
| `categories.list` / `create` / `update` / `delete` | Category CRUD (slug auto-derived) |
| `customers.list` / `detail` | Customer list (deferred search) and full detail |
| `products.list` / `get` / `create` / `update` / `archive` / `restore` / `delete` | Catalogue management, incl. show-archived |
| `delivery.getSettings` / `updateSettings` | Store coordinates and rate per km |
| `delivery.listMen` / `createMan` / `updateMan` / `setActive` / `deleteMan` | Delivery staff CRUD |
| `delivery.assign` | Attach/detach a delivery man to an order and move it to `ASSIGNED` |
| `listOrders` / `updateOrderStatus` / `updateRefundStatus` | Order operations, gated by the transition maps |
| `listProducts` / `getProduct` / `createProduct` / `updateProduct` / `deleteProduct` / `togglePublish` | Earlier flat-shaped product procedures |
| `listCategories` / `createCategory` | Earlier flat-shaped category procedures |
| `createSku` / `updateSku` / `deleteSku` | Flat SKU management used by `sku-manager.tsx` |

---

## How key features work

### Authentication & admin gating

`better-auth` in `src/lib/auth.ts` (Prisma adapter), client in
`src/lib/auth-client.ts`. Email/password plus Google OAuth, with Resend handling
verification mail.

Admin status is a plain env list — `isAdminEmail()` in `src/lib/admin.ts` splits
`ADMIN_EMAILS` on commas and compares case-insensitively. Because the variable is
optional, **leaving it unset means nobody is an admin**.

Three independent layers enforce it:
1. `adminProcedure` in `src/server/api/trpc.ts` — throws `FORBIDDEN` for every
   admin procedure.
2. `src/app/admin/layout.tsx` — redirects at the layout level.
3. UploadThing's `imageUploader` route — checks `isAdminEmail` before accepting.

### Cart: guest vs. signed-in

- **Guests** — a Zustand store persisted to `localStorage` (`stores/cart-store.ts`).
- **Signed-in** — server-side through tRPC.

`hooks/use-cart-skus.ts` and `hooks/use-cart.ts` bridge the two so components take
one interface. `Cart` allows a null `userId`, so a guest cart can be migrated to the
server on sign-in.

### Address detection & geocoding

The customer never types coordinates. `hooks/use-address-geocode.ts` watches the
address fields and, **1.5 s after typing stops**, forward-geocodes the address
through OpenStreetMap Nominatim (no API key) and fills the hidden coordinate pair.

"Use my location" does the opposite: it takes a GPS fix and then **reverse-geocodes**
it (`reverseGeocode()` in `src/lib/geocode.ts`) to fill in province, city and street,
then shows a toast reminding the customer to check and correct the details. Because
the fix is marked as user-supplied, the typing watcher will not re-geocode and shift
the drop-off point.

`normalizeProvince()` is deliberately defensive: Nominatim returns province names
that are misspelled (`Bagamati Province`), in Nepali script (`बागमती प्रदेश`), or
using pre-2015 numbers (`Province No. 3`), so the ISO 3166-2:NP code (`NP-P3`) is
matched first and the name is only a fallback.

If geocoding fails, `handleInvalid` surfaces a red banner in the location box with a
hint to check the address or use the current location, instead of a raw validation
error.

### Delivery fee calculation

`src/lib/delivery.ts` is the single calculator:
- `haversineKm(from, to)` — great-circle distance, `EARTH_RADIUS_KM = 6371`.
- `roundDistanceKm(km)` — to 3 decimals (metres).
- `roundRupees(amount)` — to 2 decimals, **never ceiled**.
- `quoteDelivery({ store, customer, ratePerKm })` → `{ distanceKm, deliveryCharge }`.
  A null store or null rate means **free delivery**.

The checkout preview calls the same helper in the browser, but the order creation
procedure **never trusts the client**. `orders.create` re-reads `StoreSetting`,
re-runs `quoteDelivery`, and re-reads every SKU price from the database. The client's
`createOrderSchema` has no field for a delivery charge at all.

The computed values are then **snapshotted** onto the order row (`deliveryCharge`,
`deliveryDistanceKm`, `deliveryRatePerKm`, `storeLat`, `storeLng`), so changing the
rate later cannot retroactively alter what a customer was charged.

### Payments (eSewa / Khalti)

See [`/api/checkout-session`](#http-routes) above for the full initiation and
verification flow. The important invariants:

- The client cannot mark an order paid. Only the gateway receipt can.
- Payment completion is a single atomic `updateMany` guarded on both status and
  `paidAt: null`, so a replayed receipt is a no-op.
- `esewaTransactionUuid` and `khaltiPidx` are `@unique`, so one receipt can never be
  reused for another order.
- Amounts are verified against the order, not just accepted from the gateway.

Brand assets live in `public/payments/` — the official eSewa and Khalti logos, used
across the checkout payment selector and the gateway payment page.

### Order lifecycle, cancellation & refunds

Status changes are not free-form; both maps live in `src/lib/admin-schema.ts`.

`ORDER_TRANSITIONS`:
```
PENDING         → PAID, ASSIGNED, CANCELLED
PAID            → ASSIGNED, PROCESSING, CANCELLED
PROCESSING      → SHIPPED, ASSIGNED, OUT_FOR_DELIVERY, CANCELLED
ASSIGNED        → OUT_FOR_DELIVERY, PROCESSING, CANCELLED
OUT_FOR_DELIVERY→ DELIVERED, CANCELLED
SHIPPED         → DELIVERED, OUT_FOR_DELIVERY, CANCELLED
DELIVERED       → REFUNDED
CANCELLED/REFUNDED → (terminal)
```

`REFUND_TRANSITIONS`:
```
PENDING   → PROCESSING, REFUNDED, FAILED
PROCESSING→ PENDING, REFUNDED, FAILED
FAILED    → PENDING, PROCESSING
REFUNDED  → (terminal)
```

Cancelling restocks the SKUs and, if the order was paid, opens a `PENDING` refund
before flipping the status, so the response already carries the refund row.
`ensureRefund()` never touches an existing `PENDING` refund — only an admin advances
it, so money isn't silently marked returned.

Customers can cancel while the order is `PENDING`, `PAID`, `PROCESSING` or
`ASSIGNED`. They can change payment method only while unpaid and still `PENDING` or
`ASSIGNED`; doing so clears the abandoned transaction identifiers.

`paidAt` is set automatically when an admin marks an order `PAID`, or delivers a
`COD` order — only if it wasn't already set.

### Image storage & cleanup

UploadThing serves two routes (admin product images, user avatars). On the server,
`lib/image-cleanup.ts` reports storage usage and sweeps images no longer referenced
by any SKU or product. The admin settings page surfaces this as
`ImageCleanupCard`.

---

## Verification

There is no test suite. Two scripts stand in for one:

| Script | What it does |
|---|---|
| `bun run check:api` | `scripts/check-api.ts` — **exercises every tRPC procedure** against a real database, asserting behaviour and access control (145 checks) |
| `bun scripts/_verify_delivery.ts` | `scripts/_verify_delivery.ts` — delivery-fee and order-lifecycle invariants (89 checks) |

Run the full gate before committing, in this order:

```bash
bun run format
bun run lint
bun run typecheck
bun run build
bun run check:api
bun scripts/_verify_delivery.ts
```

Both verification scripts write to the configured database — point them at a
disposable database rather than production.