import type { ColumnType } from 'kysely'

// BetterAuth tables — created by migrations/0001_better_auth.ts, written by
// BetterAuth. Typed here so app code can read/join them (e.g. FK to user.id).
// Columns are camelCase. `account` and `verification` are internal and left
// out on purpose. Add your own tables below with their own migrations.
type Timestamp = ColumnType<Date, Date | string, Date | string>
type DefaultTimestamp = ColumnType<Date, Date | string | undefined, Date | string>

export interface UserTable {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: DefaultTimestamp
  updatedAt: DefaultTimestamp
}

export interface SessionTable {
  id: string
  userId: string
  token: string
  expiresAt: Timestamp
  ipAddress: string | null
  userAgent: string | null
  createdAt: DefaultTimestamp
  updatedAt: Timestamp
}

export interface Database {
  user: UserTable
  session: SessionTable
}
