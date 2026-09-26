# AGENTS.md

## Quick commands

```bash
npm run lint         # biome lint .
npm run format       # biome check --write .
npm run typecheck    # tsc --noEmit
npm run build        # next build
npm run dev          # next dev (localhost:3000)
```

**No test suite exists.** There are no test scripts, no test files, and no testing framework.

## Linter / formatter

**Biome** is the sole linter and formatter (no ESLint, no Prettier).
Run `npm run format` before committing. VS Code is configured to format on save via Biome.

## Type checking

Run `npm run typecheck` (tsc --noEmit). This is separate from `npm run build`.

## Recommended verification order

```
npm run format -> npm run lint -> npm run typecheck -> npm run build
```

## Database

- PostgreSQL on Neon, accessed via Prisma 7 with `@prisma/adapter-pg` driver adapter.
- Schema: `prisma/schema.prisma`
- After schema changes: `npm run db:generate && npm run db:migrate`
- Seed data: `bun seed.ts` (creates 10 categories + 61 products). Catalog lives in
  `src/lib/catalog.ts`; product images are real photos in `public/products/`
  (manifest: `src/lib/product-images.json`). Re-fetch images with
  `bun scripts/fetch-product-images.ts` (sources: Wikimedia Commons + Openverse).
- Prisma client is generated into `src/generated/prisma` (gitignored).
- Prisma Studio: `npm run db:studio`

## Environment variables

Required (validated at runtime via `@t3-oss/env-nextjs` in `src/config/env.ts`):

| Variable | Scope |
|---|---|
| `DATABASE_URL` | server |
| `BETTER_AUTH_SECRET` | server |
| `RESEND_API_KEY` | server |
| `GOOGLE_CLIENT_ID` | server |
| `GOOGLE_CLIENT_SECRET` | server |
| `ESEWA_MERCHANT_CODE` | server (default `EPAYTEST`) |
| `ESEWA_SECRET_KEY` | server (default `8gBm/:&EnhH.1/q`) |
| `ESEWA_ENV` | server (`sandbox` default | `production`) |
| `KHALTI_SECRET_KEY` | server (default = sandbox merchant secret) |
| `KHALTI_PUBLIC_KEY` | server (default = sandbox merchant public key) |
| `KHALTI_ENV` | server (`sandbox` default | `production`) |
| `NEXT_PUBLIC_BASE_URL` | client |

The eSewa vars default to the UAT/sandbox merchant (`EPAYTEST`) so the app works out of the box. Set `ESEWA_ENV=production` with real merchant credentials to go live. Sandbox test account: `9711111111` / `Nepal@123` (OTP token `123456`).

The Khalti keys default to the sandbox test merchant credentials; set `KHALTI_ENV=production` with real keys to go live. Sandbox test Khalti IDs: `9800000000`–`9800000005` (MPIN `1111`, OTP `987654`).

No `.env.example` exists. Copy values from `.env` (if present) or set up fresh.

## Architecture

- **Next.js 16 App Router** with React 19 and React Compiler enabled.
- **tRPC 11** for type-safe API (`src/server/api/` for routers, `src/__rpc/` for client/server callers).
- **shadcn/ui** (v4, `base-vega` style) + Tailwind CSS v4 (CSS-based config in `globals.css`, no `tailwind.config`).
- **Feature-based organization:** `src/features/{auth,cart,homepage,products}/components/`.
- **Cart:** Dual-mode — guest carts use Zustand localStorage (`src/stores/cart-store.ts`), logged-in carts use server-side tRPC.
- **Auth:** `better-auth` (email/password + Google OAuth). Server config: `src/lib/auth.ts`, client: `src/lib/auth-client.ts`. Users get `role: CUSTOMER` by default; promote to ADMIN with `bun scripts/make-admin.ts <email>` (add `--demote` to revert). Create a ready-to-login admin with `bun scripts/create-admin.ts [email] [password]` (defaults `admin@gada.com` / `Admin@1234!`; idempotent, `--reset-password` to update an existing user's password). `/admin` and all `admin.*` tRPC procedures require `role === "ADMIN"`.
- **Payments:** Real eSewa ePay integration lives in `src/lib/esewa.ts` (HMAC-SHA256 signing, callback decode, status-check API). Initiation is `orders.initiateEsewaPayment` (tRPC); eSewa redirects back to `/api/payments/esewa/success` (route handler that verifies via the status-check API and marks the order PAID) or `/checkout/payment-failed`. Lost-redirect recovery: `orders.verifyEsewaPayment` (orders page "Check payment status"). Real Khalti KPG-2 ePayment integration lives in `src/lib/khalti.ts` (server-to-server `epayment/initiate/` → `payment_url` redirect, authoritative `epayment/lookup/` verify). Initiation is `orders.initiateKhaltiPayment` (tRPC); Khalti redirects back to `/api/payments/khalti/success` (route handler that lookups and marks the order PAID) or `/checkout/payment-failed`. Lost-redirect recovery: `orders.verifyKhaltiPayment`. Both gateways end at the same order flow — no demo/mock payment path remains; `orders.completePayment` rejects all wallet methods.

## Key paths

| Path | Purpose |
|---|---|
| `src/app/` | Next.js pages and API routes |
| `src/server/api/` | tRPC routers and procedures |
| `src/__rpc/` | tRPC client provider + server-side caller |
| `src/features/` | Feature-organized components |
| `src/lib/` | Shared utilities (prisma, auth, email, cn()) |
| `src/config/env.ts` | Environment variable validation |
| `src/generated/prisma/` | Generated Prisma client (gitignored) |
| `prisma/schema.prisma` | Database schema |
| `components.json` | shadcn/ui configuration |
| `biome.jsonc` | Linter/formatter config |

## Gotchas

- `src/components/ui/*.tsx` are shadcn-generated; Biome linting is disabled for them. Don't manually edit unless regenerating.
- Path alias `@/*` maps to `./src/*`.
- Use bun for scripts and pm instead of npm
    