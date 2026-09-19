/**
 * BetterAuth — per-request factory. Reads secrets from globalThis.__cfEnv,
 * so it must only be imported from server code (server functions, loaders,
 * queue/scheduled handlers). Never import this from a client component.
 */
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { Pool } from '@neondatabase/serverless'

declare global {
  // eslint-disable-next-line no-var
  var __cfEnv: Record<string, string> | undefined
}

export function getAuth() {
  const env = globalThis.__cfEnv
  if (!env?.DATABASE_URL || !env?.BETTER_AUTH_SECRET) {
    throw new Error('Missing DATABASE_URL or BETTER_AUTH_SECRET on globalThis.__cfEnv')
  }

  return betterAuth({
    database: new Pool({ connectionString: env.DATABASE_URL }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true },
    // Schema is managed by `pnpm db:seed`. The runtime check is cached per
    // instance, and this factory builds one per request, so leaving it on
    // would introspect Neon on every auth request.
    advanced: { database: { validateSchema: false } },
    // tanstackStartCookies MUST be last so it can wrap responses.
    plugins: [tanstackStartCookies()],
  })
}
