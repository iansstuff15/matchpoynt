import { serve } from '@hono/node-server'
import { createApp } from '@/app'
import { env } from '@/config/env'
import { features } from '@/config/features'

const { API_PORT, GIPHY_API_KEY } = env()
// Fail at startup, not on first request, if a FEATURE_* value is malformed.
const { web } = features()
if (web.gifSearch && !GIPHY_API_KEY) {
  throw new Error('FEATURE_WEB_GIF_SEARCH is on but GIPHY_API_KEY is missing. Add the key (developers.giphy.com) or turn GIF search off. See .env.example.')
}
const server = serve({ fetch: createApp().fetch, port: API_PORT, hostname: '0.0.0.0' }, ({ port }) => {
  console.log(`Matchpoynt API listening on :${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
