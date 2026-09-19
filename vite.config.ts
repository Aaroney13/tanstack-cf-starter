import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    hmr: { overlay: false },
  },
  build: {
    rollupOptions: {
      external: ['node:stream', 'node:stream/web', 'node:async_hooks'],
    },
  },
  plugins: [
    // Stub `cloudflare:workers` in the client environment only.
    // It's an SSR-only virtual module; tagging it as the empty stub keeps
    // the client resolver happy while TanStack Start strips server code at build.
    {
      name: 'stub-cloudflare-workers-on-client',
      enforce: 'pre' as const,
      resolveId(source: string) {
        if (source === 'cloudflare:workers' && this.environment?.name === 'client') {
          return fileURLToPath(
            new URL('./src/cloudflare-workers-client-stub.ts', import.meta.url),
          )
        }
        return null
      },
    },
    // Cloudflare must come first per official docs.
    // WRANGLER_CONFIG=dev → wrangler.dev.jsonc, otherwise wrangler.jsonc.
    cloudflare({
      viteEnvironment: { name: 'ssr' },
      configPath:
        process.env.WRANGLER_CONFIG === 'dev'
          ? './wrangler.dev.jsonc'
          : './wrangler.jsonc',
    }),
    tanstackStart(),
    viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    viteReact(),
  ],
})
