import { Hono } from 'hono'
import { env } from '@/config/env'
import { searchGifs } from '@/utils/gif/giphy'
import { requireFeature } from '@/utils/http/feature'
import { requireCompleteProfile, requireUser, resolveUser } from '@/utils/http/middleware'
import type { AppEnv } from '@/utils/http/types'
import { invalid } from '@/utils/http/errors'
import { gifSearchQuery } from '@/utils/validation/schemas'

/** GIF search for club badge icons, through GIPHY. The key stays here; the browser only sees results. */
export const gifRoutes = new Hono<AppEnv>()
  .use(requireFeature('web', 'clubs'))
  .use(requireFeature('web', 'clubBadges'))
  .use(requireFeature('web', 'gifSearch'))
  .use(resolveUser)
  .use(requireUser)
  .use(requireCompleteProfile)
  .get('/search', async (c) => {
    const parsed = gifSearchQuery.safeParse(c.req.query())
    if (!parsed.success) throw invalid('Search for something shorter.', { q: parsed.error.issues[0]?.message ?? 'Invalid' })
    const { q, offset } = parsed.data
    c.header('Cache-Control', 'private, max-age=60')
    return c.json(await searchGifs(env().GIPHY_API_KEY ?? '', q, offset))
  })
