/**
 * BetterAuth — per-request factory. Reads secrets from globalThis.__cfEnv,
 * so it must only be imported from server code (server functions, loaders,
 * queue/scheduled handlers). Never import this from a client component.
 */
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import type { Kysely } from 'kysely'
import { getDb } from '@/db/server'
import type { Database } from '@/db/types'

declare global {
  // eslint-disable-next-line no-var
  var __cfEnv: Record<string, string> | undefined
}

/**
 * `db` defaults to getDb() (Neon HTTP, one fetch per query). HTTP can't hold
 * a transaction, so BetterAuth's multi-step writes (e.g. sign-up's user +
 * account rows) run sequentially rather than atomically. Scripts pass a
 * createPoolDb() client instead.
 */
export function getAuth(db: Kysely<Database> = getDb()) {
  const env = globalThis.__cfEnv
  if (!env?.BETTER_AUTH_SECRET) {
    throw new Error('Missing BETTER_AUTH_SECRET on globalThis.__cfEnv')
  }

  return betterAuth({
    database: { db, type: 'postgres' },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true },
    // Schema is managed by Kysely migrations (`pnpm db:migrate`). The runtime
    // check is cached per instance, and this factory builds one per request,
    // so leaving it on would introspect Neon on every auth request.
    advanced: { database: { validateSchema: false } },
    // tanstackStartCookies MUST be last so it can wrap responses.
    plugins: [tanstackStartCookies()],
  })
}
