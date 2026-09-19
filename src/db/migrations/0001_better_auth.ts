import { sql, type Kysely } from 'kysely'

// BetterAuth core tables, matching the schema BetterAuth 1.7 expects for
// Postgres (camelCase columns, text ids). `pnpm db:migrate` verifies against
// BetterAuth after migrating, so drift here gets reported.

export async function up(db: Kysely<any>): Promise<void> {
  const now = sql`CURRENT_TIMESTAMP`

  await db.schema
    .createTable('user')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('email', 'text', (c) => c.notNull().unique())
    .addColumn('emailVerified', 'boolean', (c) => c.notNull())
    .addColumn('image', 'text')
    .addColumn('createdAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updatedAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .execute()

  await db.schema
    .createTable('session')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('expiresAt', 'timestamptz', (c) => c.notNull())
    .addColumn('token', 'text', (c) => c.notNull().unique())
    .addColumn('createdAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updatedAt', 'timestamptz', (c) => c.notNull())
    .addColumn('ipAddress', 'text')
    .addColumn('userAgent', 'text')
    .addColumn('userId', 'text', (c) => c.notNull().references('user.id').onDelete('cascade'))
    .execute()

  await db.schema
    .createTable('account')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('accountId', 'text', (c) => c.notNull())
    .addColumn('providerId', 'text', (c) => c.notNull())
    .addColumn('userId', 'text', (c) => c.notNull().references('user.id').onDelete('cascade'))
    .addColumn('accessToken', 'text')
    .addColumn('refreshToken', 'text')
    .addColumn('idToken', 'text')
    .addColumn('accessTokenExpiresAt', 'timestamptz')
    .addColumn('refreshTokenExpiresAt', 'timestamptz')
    .addColumn('scope', 'text')
    .addColumn('password', 'text')
    .addColumn('createdAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updatedAt', 'timestamptz', (c) => c.notNull())
    .execute()

  await db.schema
    .createTable('verification')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('identifier', 'text', (c) => c.notNull())
    .addColumn('value', 'text', (c) => c.notNull())
    .addColumn('expiresAt', 'timestamptz', (c) => c.notNull())
    .addColumn('createdAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updatedAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .execute()

  await db.schema.createIndex('session_userId_idx').on('session').column('userId').execute()
  await db.schema.createIndex('account_userId_idx').on('account').column('userId').execute()
  await db.schema
    .createIndex('verification_identifier_idx')
    .on('verification')
    .column('identifier')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  for (const table of ['verification', 'account', 'session', 'user']) {
    await db.schema.dropTable(table).execute()
  }
}
