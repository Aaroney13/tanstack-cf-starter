import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
// import { getDb } from '@/db/server'

/**
 * Canonical server function shape:
 *   createServerFn({ method }).inputValidator(zodSchema).handler(async ({ data }) => ...)
 *
 * NOTE: it's `.inputValidator(...)` — `.validator(...)` does NOT exist.
 */
export const greet = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ name: z.string().min(1).max(100) }))
  .handler(async ({ data }) => {
    // const db = getDb()
    // const user = await db.selectFrom('user').selectAll().executeTakeFirst()
    return { message: `Hello, ${data.name}` }
  })
