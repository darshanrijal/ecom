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
- Seed data: hit `GET /api/seed` (creates 12 categories + 40+ products).
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
| `NEXT_PUBLIC_BASE_URL` | client |

No `.env.example` exists. Copy values from `.env` (if present) or set up fresh.

## Architecture

- **Next.js 16 App Router** with React 19 and React Compiler enabled.
- **tRPC 11** for type-safe API (`src/server/api/` for routers, `src/__rpc/` for client/server callers).
- **shadcn/ui** (v4, `base-vega` style) + Tailwind CSS v4 (CSS-based config in `globals.css`, no `tailwind.config`).
- **Feature-based organization:** `src/features/{auth,cart,homepage,products}/components/`.
- **Cart:** Dual-mode — guest carts use Zustand localStorage (`src/stores/cart-store.ts`), logged-in carts use server-side tRPC.
- **Auth:** `better-auth` (email/password + Google OAuth). Server config: `src/lib/auth.ts`, client: `src/lib/auth-client.ts`.

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
