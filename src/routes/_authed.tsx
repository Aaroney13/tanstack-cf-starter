import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { getAuth } from '@/lib/auth.server'

// Auth guard. Wire `getAuth()` to a real BetterAuth config before relying on this.
const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const cookie = getRequestHeader('cookie') || ''
  if (!cookie.includes('better-auth.session_token')) return null
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: new Headers({ cookie }) })
  return session?.user ? session : null
})

export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/' })
    return { session }
  },
  component: () => <Outlet />,
})
