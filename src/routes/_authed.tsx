import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { getAuth } from '@/lib/auth.server'

// Auth guard: children only render with a valid BetterAuth session;
// everyone else is redirected to `/`.
const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const cookie = getRequestHeader('cookie') || ''
  if (!cookie.includes('better-auth.session_token')) return null
  try {
    const session = await getAuth().api.getSession({ headers: new Headers({ cookie }) })
    return session?.user ? session : null
  } catch (error) {
    // Missing secrets, DB unreachable, etc. Fail closed (redirect) but keep
    // the cause in the server log.
    console.error('[_authed] session lookup failed:', error)
    return null
  }
})

export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/' })
    return { session }
  },
  component: () => <Outlet />,
})
