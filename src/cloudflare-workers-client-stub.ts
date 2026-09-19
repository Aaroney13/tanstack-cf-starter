// Empty stub for `cloudflare:workers` in the client environment.
// `cloudflare:workers` is an SSR-only virtual module provided by
// @cloudflare/vite-plugin. Server modules that import it can get pulled
// into the client graph via the generated route tree; this stub satisfies
// the client resolver, and the reference is dead at runtime because
// TanStack Start strips server-only code from the client bundle.
export const env: Record<string, unknown> = {}
