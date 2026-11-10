import { serve } from '@hono/node-server'
import { createApp } from '@/app'
import { env } from '@/config/env'
import { checkStartup } from '@/config/startup'

// The API as a long-running Node server (Docker, `pnpm dev`). On Vercel, src/vercel.ts is the entrypoint instead.
checkStartup()
const server = serve({ fetch: createApp().fetch, port: env().API_PORT, hostname: '0.0.0.0' }, ({ port }) => {
  console.log(`Matchpoynt API listening on :${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
