# CLAUDE.md

Conventions for this starter. Future projects copied from this template should keep these rules.

## Commands

```bash
pnpm dev              # Dev server on port 3000
pnpm build            # Production build
pnpm test             # Vitest (jsdom)
pnpm deploy:dev       # Build + deploy via wrangler.dev.jsonc
pnpm deploy:prod      # Build + deploy via wrangler.jsonc
pnpm cf-typegen       # Regenerate worker-configuration.d.ts from wrangler bindings
pnpm dlx shadcn@latest add <component>     # Add shadcn/ui (after enabling)
pnpm db:migrate       # Apply Kysely migrations (src/db/migrations/) to Neon + verify BetterAuth schema
pnpm db:seed          # db:migrate, then create the SEED_USER_* login if set
```

## Stack

- **TanStack Start** (React 19 SSR) on **Cloudflare Workers**
- **Neon Postgres** via **Kysely** (`src/db/server.ts` → `getDb()`)
- **BetterAuth** on the same Kysely client (per-request factory in `src/lib/auth.server.ts`)
- **Tailwind CSS v4** — CSS-first, no `tailwind.config.js`
- **Vitest** + jsdom for tests

## Cloudflare Workers env access

**Rule**: `src/entry-server.ts` is the ONLY file that imports `cloudflare:workers`. It sets `globalThis.__cfEnv = env` before any request runs. Everywhere else, server code reads `globalThis.__cfEnv.X`.

Why: importing `cloudflare:workers` outside `entry-server.ts` pulls the SSR-only virtual module into the client graph (the route tree statically imports server modules). The client bundle then fails to resolve it. The `__cfEnv` indirection sidesteps this entirely.

The `queue()` and `scheduled()` handlers each receive their own `env` argument and must reassign `globalThis.__cfEnv = env` at the top — they run in separate I/O contexts from `fetch`.

## Server functions

```ts
export const myFn = createServerFn({ method: 'POST' })
  .inputValidator(zodSchema)   // NOT .validator() — that doesn't exist
  .handler(async ({ data }) => { ... })
```

**CRITICAL gotcha**: never wrap multiple `createServerFn` calls in `Promise.all` inside a route loader. Server functions share the Cloudflare I/O context and you'll get `Cannot perform I/O on behalf of a different request`. Use sequential `await`.

## Routing

File-based via TanStack Router in `src/routes/`:
- `__root.tsx` — HTML shell + `<Outlet />`
- `_authed.tsx` — auth guard (uses `beforeLoad` + `redirect`)
- Use route `loader` for SSR prefetching, NOT `useEffect`.
- Use `beforeLoad` for auth checks.

After adding/removing route files, run `pnpm dev` once to regenerate `src/routeTree.gen.ts` (the TanStack Router plugin handles it).

## Database

- `getDb()` returns a Kysely client backed by Neon's HTTP driver. Sync, cheap, one fetch per query. No interactive transactions.
- `createPoolDb()` returns Kysely over a Neon WebSocket `Pool({ max: 1 })`: real transactions, but the caller must `await db.destroy()` (within the same request on Workers).
- `withTransaction(cb)` wraps `createPoolDb()` for one BEGIN/COMMIT. Use it ONLY when you need atomicity across statements — single-statement guards (`UPDATE ... WHERE balance >= ?`) are already atomic.
- Schema types live in `src/db/types.ts`. Add new tables there.

### Migrations

- Kysely migrations in `src/db/migrations/NNNN_name.ts`, each exporting `up(db)` / `down(db)`. `pnpm db:migrate` (`scripts/db.ts`) applies pending ones via Kysely's `Migrator` over `createPoolDb()`; state lives in `kysely_migration`. Never edit an applied migration — add a new one.
- `0001_better_auth.ts` creates BetterAuth's `user` / `session` / `account` / `verification` tables (camelCase columns, text ids).
- After migrating, `db:migrate` asks BetterAuth to diff the DB against `getAuth()`'s config. If you add a BetterAuth plugin, it fails and prints the SQL BetterAuth wants: put that in a new migration (`` sql`...`.execute(db) `` is fine) and mirror any tables you query in `types.ts`.
- Env: real env vars > `.dev.vars` > `.env`. Target prod with `DATABASE_URL=... pnpm db:migrate`. `pnpm db:seed` also creates a verified login from `SEED_USER_EMAIL` + `SEED_USER_PASSWORD` (skipped if it exists).
- Don't use `@better-auth/cli migrate` / `generate`: there's no static `auth` export for it to load, and env comes from `__cfEnv`.

### BetterAuth + Kysely

`getAuth()` passes `{ db: getDb(), type: 'postgres' }` to BetterAuth, so it runs on Neon HTTP with no per-request WebSocket. HTTP can't hold a transaction, so BetterAuth's multi-step writes (sign-up's user + account rows) run sequentially, not atomically. `getAuth(db)` accepts another Kysely client (scripts pass `createPoolDb()` or a transaction). The runtime schema check is off (`validateSchema: false`) because migrations own the schema and the factory runs per request.

## Wrangler dual-config

- `wrangler.jsonc` — production
- `wrangler.dev.jsonc` — dev (`workers_dev: true`, `-dev` suffixed bindings)
- Selected via `WRANGLER_CONFIG=dev` env var in `vite.config.ts` and `package.json` deploy scripts.
- Secrets go through `wrangler secret put NAME` (and `... -c wrangler.dev.jsonc` for dev). Never commit them.

## Tailwind v4

No config file. Import in `src/styles.css`:
```css
@import 'tailwindcss';
```
Add design tokens as CSS custom properties in the same file. Use `@apply` for body-level resets only.

## Testing

Vitest aliases `cloudflare:workers` → `src/__tests__/__mocks__/cloudflare-workers.ts`. To use bindings in a test:

```ts
beforeEach(() => {
  (globalThis as any).__cfEnv = { DATABASE_URL: '...', BETTER_AUTH_SECRET: '...' }
})
```

## Gotchas

- TS strict mode + `noUnusedLocals`/`noUnusedParameters` — prefix unused with `_`.
- When extracting large JSX blocks, replace the whole block in one Edit call so closing tags don't orphan.
- `routeTree.gen.ts` and `worker-configuration.d.ts` are generated — they're in `.gitignore`.
- `_authed.tsx` is a pathless layout: it needs at least one child route (e.g. `_authed/dashboard.tsx`), or it collides with `index.tsx` at `/` and route generation fails.
