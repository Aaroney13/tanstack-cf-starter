import type { ColumnType, Generated } from 'kysely'

export interface UsersTable {
  id: Generated<string>
  email: string
  name: string | null
  created_at: ColumnType<Date, string | undefined, never>
}

// BetterAuth tables — created by `pnpm db:seed`, written by BetterAuth. Typed
// here so app code can read/join them (e.g. FK to user.id). Columns are
// camelCase. `account` and `verification` are internal and left out on purpose.
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
  users: UsersTable
  user: UserTable
  session: SessionTable
}
