import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="grid min-h-screen place-items-center">
      <p className="text-sm text-zinc-500">tanstack-cf-starter — ready</p>
    </main>
  )
}
