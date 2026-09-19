import { env } from 'cloudflare:workers'
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

// Expose Cloudflare env on globalThis so getDb() / auth.server / etc. can
// read DATABASE_URL & friends without importing cloudflare:workers themselves.
// entry-server.ts is the Worker entry (SSR-only), so this ESM import is fine
// here and runs before any request or server function executes.
globalThis.__cfEnv = env as unknown as Record<string, string>

const serverEntry = createServerEntry({
  async fetch(request) {
    return handler.fetch(request)
  },
})

export default {
  ...serverEntry,
  async queue(
    batch: MessageBatch<unknown>,
    env: Record<string, unknown>,
    _ctx: ExecutionContext,
  ) {
    // queue() receives its own env — keep __cfEnv in sync so downstream
    // code (getDb, etc.) sees the same bindings as fetch().
    globalThis.__cfEnv = env as unknown as Record<string, string>

    // Dispatch by queue name. startsWith handles dev/prod name suffixes.
    if (batch.queue.startsWith('starter-mail-queue')) {
      // const { processMailQueue } = await import('./server/mail/queue-consumer')
      // await processMailQueue(batch, env, _ctx)
      console.log(`[queue] received ${batch.messages.length} on ${batch.queue}`)
    } else if (batch.queue.startsWith('starter-usage-queue')) {
      console.log(`[queue] received ${batch.messages.length} on ${batch.queue}`)
    }
  },
  async scheduled(
    event: ScheduledEvent,
    env: Record<string, unknown>,
    _ctx: ExecutionContext,
  ) {
    globalThis.__cfEnv = env as unknown as Record<string, string>
    console.log(`[scheduled] cron ${event.cron} fired`)
  },
}
