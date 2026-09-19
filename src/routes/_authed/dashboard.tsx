import { createFileRoute } from '@tanstack/react-router'

// Example guarded route. `_authed`'s beforeLoad has already fetched the
// session (or redirected to `/`), so read it from route context instead of
// fetching it again in a loader.
export const Route = createFileRoute('/_authed/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { session } = Route.useRouteContext()
  const { user } = session

  return (
    <main className="grid min-h-screen place-items-center">
      <div className="space-y-1 text-center">
        <p className="text-sm text-zinc-500">Signed in as</p>
        <p className="font-medium">{user.name || user.email}</p>
        {user.name && <p className="text-sm text-zinc-500">{user.email}</p>}
      </div>
    </main>
  )
}
