# tanstack-cf-starter

Opinionated starter: TanStack Start (React 19 SSR) on Cloudflare Workers, Neon Postgres via Kysely, BetterAuth, Tailwind v4. See [CLAUDE.md](./CLAUDE.md) for conventions.

```bash
pnpm install
cp .env.example .dev.vars   # for wrangler local dev secrets — set DATABASE_URL to your Neon dev branch
pnpm db:seed                # run Kysely migrations (BetterAuth tables) + optional dev login
pnpm dev                    # → http://localhost:3000
```

`/dashboard` (`src/routes/_authed/dashboard.tsx`) is the example guarded route: it reads the session from the `_authed` layout's route context, and signed-out visitors are redirected to `/`.

Before deploying:
1. `pnpm wrangler kv namespace create CONFIG_KV` → paste id into `wrangler.jsonc`
2. `pnpm wrangler r2 bucket create starter-images`
3. `pnpm wrangler queues create starter-mail-queue` (and others + their `-dlq` siblings)
4. `pnpm wrangler secret put DATABASE_URL` / `BETTER_AUTH_SECRET`
5. `DATABASE_URL=<prod Neon URL> pnpm db:migrate` to apply migrations to the prod database
6. `pnpm deploy:dev` or `pnpm deploy:prod`
