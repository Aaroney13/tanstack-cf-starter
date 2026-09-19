/// <reference types="node" />
/**
 * Creates/updates the BetterAuth tables in Neon, then optionally seeds a login.
 *
 *   pnpm db:seed              # apply BetterAuth schema (idempotent)
 *   pnpm db:seed --dry-run    # print the SQL instead of running it
 *
 * The schema is derived from the same getAuth() config the Worker uses, so
 * after adding a BetterAuth plugin (organization, admin, ...) re-run this to
 * pick up its tables/columns. Changes are additive only — nothing is dropped.
 *
 * Env precedence: real env vars > .dev.vars > .env. Point at another database
 * with `DATABASE_URL=... pnpm db:seed`.
 *
 * Set SEED_USER_EMAIL + SEED_USER_PASSWORD (and optionally SEED_USER_NAME) to
 * also create a verified email/password user. Skipped if the email exists.
 */
import { existsSync } from 'node:fs'
import type { Pool } from '@neondatabase/serverless'
import { getMigrations } from 'better-auth/db/migration'
import { getAuth } from '../src/lib/auth.server'

for (const file of ['.dev.vars', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file)
}
globalThis.__cfEnv = process.env as Record<string, string>

const dryRun = process.argv.includes('--dry-run')
const auth = getAuth()

async function migrateSchema() {
  const { toBeCreated, toBeAdded, toBeAddedIndexes, schemaProblems, runMigrations, compileMigrations } =
    await getMigrations(auth.options)

  for (const problem of schemaProblems) console.warn(`⚠ ${problem}`)

  if (!toBeCreated.length && !toBeAdded.length && !toBeAddedIndexes.length) {
    console.log('✓ BetterAuth schema is up to date')
    return
  }

  if (dryRun) {
    console.log(await compileMigrations())
    return
  }

  await runMigrations()
  for (const { table } of toBeCreated) console.log(`+ created table "${table}"`)
  for (const { table, fields } of toBeAdded) {
    console.log(`+ added ${Object.keys(fields).join(', ')} to "${table}"`)
  }
  for (const { name } of toBeAddedIndexes) console.log(`+ created index "${name}"`)
}

async function seedUser() {
  const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_USER_PASSWORD
  if (!email || !password) return

  if (dryRun) {
    console.log(`(dry run) would seed user ${email}`)
    return
  }

  const ctx = await auth.$context
  if (await ctx.internalAdapter.findUserByEmail(email)) {
    console.log(`✓ user ${email} already exists`)
    return
  }

  // Same path as BetterAuth's admin createUser: user row + "credential" account.
  const user = await ctx.internalAdapter.createUser(
    { email, name: process.env.SEED_USER_NAME || email.split('@')[0], emailVerified: true },
    { method: 'admin' },
  )
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: await ctx.password.hash(password),
  })
  console.log(`+ seeded user ${email}`)
}

console.log(`→ ${new URL(process.env.DATABASE_URL!).host}${dryRun ? ' (dry run)' : ''}`)
try {
  await migrateSchema()
  await seedUser()
} finally {
  // getAuth() opens a Neon WebSocket pool; close it so the process can exit.
  await (auth.options.database as Pool).end()
}
