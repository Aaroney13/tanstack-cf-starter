/// <reference types="node" />
/**
 * Neon database CLI (runs in Node, not the Worker).
 *
 *   pnpm db:migrate   apply pending Kysely migrations in src/db/migrations/
 *   pnpm db:seed      db:migrate, then create the SEED_USER_* login if set
 *
 * After migrating, BetterAuth checks the schema against getAuth()'s config
 * (plugins included). If something is missing, e.g. after adding a plugin,
 * this prints the SQL BetterAuth wants: put it in a new migration file.
 *
 * Env precedence: real env vars > .dev.vars > .env, so target another
 * database with `DATABASE_URL=... pnpm db:migrate`.
 */
import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FileMigrationProvider, Migrator } from 'kysely'
import { getMigrations } from 'better-auth/db/migration'
import { createPoolDb } from '../src/db/server'
import { getAuth } from '../src/lib/auth.server'

const command = process.argv[2]
if (command !== 'migrate' && command !== 'seed') {
  console.error('usage: tsx scripts/db.ts <migrate|seed>')
  process.exit(1)
}

for (const file of ['.dev.vars', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file)
}
globalThis.__cfEnv = process.env as Record<string, string>

// Migrations need real transactions (plus Kysely's migration lock), so this
// uses a WebSocket pool rather than getDb()'s HTTP driver.
const db = createPoolDb()
const auth = getAuth(db)

async function migrate(): Promise<boolean> {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: fileURLToPath(new URL('../src/db/migrations', import.meta.url)),
    }),
  })
  const { error, results = [] } = await migrator.migrateToLatest()
  for (const { migrationName, status } of results) {
    if (status === 'Success') console.log(`+ ${migrationName}`)
    if (status === 'Error') console.error(`✗ ${migrationName}`)
  }
  if (error) throw error
  if (!results.length) console.log('✓ migrations up to date')

  const { toBeCreated, toBeAdded, toBeAddedIndexes, compileMigrations } =
    await getMigrations(auth.options)
  if (toBeCreated.length || toBeAdded.length || toBeAddedIndexes.length) {
    console.error(
      '\n✗ BetterAuth expects schema changes the migrations do not make.\n' +
        '  Add a migration in src/db/migrations/ that runs:\n',
    )
    console.error(await compileMigrations())
    process.exitCode = 1
    return false
  }
  console.log('✓ BetterAuth schema matches')
  return true
}

async function seedUser() {
  const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_USER_PASSWORD
  if (!email || !password) {
    console.log('– no SEED_USER_EMAIL/SEED_USER_PASSWORD, skipping user seed')
    return
  }

  const ctx = await auth.$context
  if (await ctx.internalAdapter.findUserByEmail(email)) {
    console.log(`✓ user ${email} already exists`)
    return
  }

  // Same path as BetterAuth's admin createUser: user row + "credential" account.
  await db.transaction().execute(async (trx) => {
    const { internalAdapter, password: hasher } = await getAuth(trx).$context
    const user = await internalAdapter.createUser(
      { email, name: process.env.SEED_USER_NAME || email.split('@')[0], emailVerified: true },
      { method: 'admin' },
    )
    await internalAdapter.linkAccount({
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: await hasher.hash(password),
    })
  })
  console.log(`+ seeded user ${email}`)
}

console.log(`→ ${new URL(process.env.DATABASE_URL!).host}`)
try {
  if ((await migrate()) && command === 'seed') await seedUser()
} finally {
  await db.destroy()
}
