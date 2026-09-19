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
pnpm db:seed          # Create/update BetterAuth tables in Neon (--dry-run prints SQL)
```

## Stack

- **TanStack Start** (React 19 SSR) on **Cloudflare Workers**
- **Neon Postgres** via **Kysely** (`src/db/server.ts` → `getDb()`)
- **BetterAuth** (per-request factory in `src/lib/auth.server.ts`)
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

- `getDb()` returns a Kysely client backed by Neon's HTTP driver. Sync, cheap, one fetch per query.
- `withTransaction(cb)` opens a one-shot WebSocket `Pool({ max: 1 })` for the duration of the callback. Use this ONLY when you need real BEGIN/COMMIT atomicity — single-statement guards (`UPDATE ... WHERE balance >= ?`) are already atomic.
- Schema types live in `src/db/types.ts`. Add new tables there.
- Plain SQL migrations live in `src/db/migrations/` (apply manually via `psql` or your tool of choice).
- BetterAuth tables (`user`, `session`, `account`, `verification`) are NOT in `migrations/`. `pnpm db:seed` (`scripts/db-seed.ts`) diffs the live DB against `getAuth()`'s config and applies additive changes. Re-run it after adding a BetterAuth plugin, and mirror any new tables you query in `types.ts`. It reads env from real env vars > `.dev.vars` > `.env`, so target prod with `DATABASE_URL=... pnpm db:seed`. `SEED_USER_EMAIL` + `SEED_USER_PASSWORD` also seed a verified login.
- Don't use `@better-auth/cli migrate`: there's no static `auth` export for it to load, and env comes from `__cfEnv`.

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
