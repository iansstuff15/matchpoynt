import type { AppConfigResponse } from '@matchpoynt/shared'
import { Hono } from 'hono'
import { features } from '@/config/features'

/** Runtime configuration for the web and desktop apps. */
export const configRoutes = new Hono().get('/', (c) => {
  const response: AppConfigResponse = { features: features() }
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(response)
})
