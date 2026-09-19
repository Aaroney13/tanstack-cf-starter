/**
 * Server-only Kysely client.
 *
 * Reads DATABASE_URL from globalThis.__cfEnv (set by entry-server.ts). This
 * file MUST NOT import `cloudflare:workers` directly — keeping that import
 * confined to entry-server.ts prevents Vite from pulling it into the client
 * bundle via the route tree.
 */

import { Kysely, PostgresDialect, type Transaction } from 'kysely'
import { NeonDialect } from 'kysely-neon'
import { neon, Pool } from '@neondatabase/serverless'
import type { Database } from './types'

declare global {
  // eslint-disable-next-line no-var
  var __cfEnv: Record<string, string> | undefined
}

function requireDatabaseUrl(): string {
  const url = globalThis.__cfEnv?.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set (is globalThis.__cfEnv initialized in entry-server.ts?)',
    )
  }
  return url
}

export function getDb(): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new NeonDialect({ neon: neon(requireDatabaseUrl()) }),
  })
}

/**
 * Run a callback inside a BEGIN/COMMIT transaction.
 *
 * `getDb()` uses Neon's HTTP driver (one fetch per query) which can't hold
 * a connection across statements. Use this only when atomicity is required.
 */
export async function withTransaction<T>(
  callback: (trx: Transaction<Database>) => Promise<T>,
): Promise<T> {
  const pool = new Pool({ connectionString: requireDatabaseUrl(), max: 1 })
  try {
    const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) })
    return await db.transaction().execute(callback)
  } finally {
    await pool.end()
  }
}
