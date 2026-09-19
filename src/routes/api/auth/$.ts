import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '@/lib/auth.server'

// BetterAuth's HTTP API (sign-in, sign-up, sign-out, get-session, ...) at
// /api/auth/*. The better-auth client talks to this route.
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => getAuth().handler(request),
      POST: ({ request }) => getAuth().handler(request),
    },
  },
})
