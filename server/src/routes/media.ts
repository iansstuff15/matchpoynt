import { Hono } from 'hono'
import { env } from '@/config/env'
import { features } from '@/config/features'
import { isMediaPath, isProfileMediaPath, mediaBucket } from '@/utils/club/media'
import { notFound, unavailable } from '@/utils/http/errors'

/**
 * Club and session photos, served same-origin so the browser never talks to
 * Supabase. The bucket is public for reads and every object name carries a
 * random UUID, so a photo can be cached for good.
 */
export const mediaRoutes = new Hono().get('/*', async (c) => {
  const path = c.req.path.replace(/^\/api\/media\//, '')
  if (!isMediaPath(path)) throw notFound('No such photo.')
  // Profile photos follow sign-in; club and session photos follow clubs.
  if (!(isProfileMediaPath(path) ? features().web.signIn : features().web.clubs)) throw notFound('Not found.')

  let res: Response
  try {
    res = await fetch(`${env().SUPABASE_URL}/storage/v1/object/public/${mediaBucket}/${path}`)
  } catch (error) {
    throw Object.assign(unavailable("The API couldn't reach photo storage (Supabase Storage)."), { cause: error })
  }
  if (res.status === 400 || res.status === 404) throw notFound('That photo no longer exists. It may have been replaced or removed.')
  if (!res.ok) throw unavailable(`Photo storage answered HTTP ${res.status}.`)

  return new Response(res.body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
})
