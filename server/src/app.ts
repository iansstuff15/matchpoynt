import { clubImages } from '@matchpoynt/shared'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { limits } from '@/config/limits'
import { accountingRoutes } from '@/routes/accounting'
import { authRoutes } from '@/routes/auth'
import { clubRoutes } from '@/routes/clubs'
import { configRoutes } from '@/routes/config'
import { directoryRoutes, peopleRoutes } from '@/routes/directory'
import { userRoutes } from '@/routes/users'
import { friendRoutes } from '@/routes/friends'
import { gifRoutes } from '@/routes/gifs'
import { mediaRoutes } from '@/routes/media'
import { playRoutes } from '@/routes/play'
import { inviteRoutes } from '@/routes/invites'
import { invoiceRoutes } from '@/routes/invoices'
import { memberRoutes } from '@/routes/members'
import { profileRoutes } from '@/routes/profile'
import { publicRoutes } from '@/routes/public'
import { sessionRoutes } from '@/routes/sessions'
import { ApiError } from '@/utils/http/errors'
import { sameOrigin } from '@/utils/http/middleware'
import { isImageUpload } from '@/utils/http/upload'

/** The API, mounted under /api behind the nginx proxy (or Vite's dev proxy). */
const jsonBodyLimit = bodyLimit({
  maxSize: limits.bodyBytes,
  // Said plainly, rather than a bare 413 the app can only call a problem on Matchpoynt's side.
  onError: () => {
    throw new ApiError('invalid', 'That was too large to send. Shorten it, or pick a smaller file.')
  },
})
const uploadBodyLimit = bodyLimit({
  maxSize: limits.uploadBodyBytes,
  onError: () => {
    throw new ApiError('invalid', `Photos can be up to ${clubImages.maxBytes / 1024 / 1024} MB. Pick a smaller one.`, { image: 'Too large' })
  },
})

export function createApp() {
  const app = new Hono()
    .basePath('/api')
    // Every response carries X-Request-Id; errors repeat it so users can quote it.
    .use(requestId())
    .use(secureHeaders())
    // Photo uploads get room for one photo; everything else stays small.
    .use((c, next) => (isImageUpload(c.req.method, c.req.path) ? uploadBodyLimit(c, next) : jsonBodyLimit(c, next)))
    .use(sameOrigin)
    .get('/health', (c) => c.json({ ok: true }))
    .route('/config', configRoutes)
    .route('/auth', authRoutes)
    .route('/sessions', sessionRoutes)
    .route('/profile', profileRoutes)
    .route('/public', publicRoutes)
    .route('/clubs', clubRoutes)
    .route('/media', mediaRoutes)
    .route('/members', memberRoutes)
    .route('/invites', inviteRoutes)
    .route('/gifs', gifRoutes)
    .route('/invoices', invoiceRoutes)
    .route('/accounting', accountingRoutes)
    .route('/directory', directoryRoutes)
    .route('/people', peopleRoutes)
    .route('/friends', friendRoutes)
    .route('/users', userRoutes)
    .route('/play', playRoutes)

  app.onError((err, c) => {
    const id = c.get('requestId')
    if (err instanceof ApiError) {
      if (err.status >= 500) console.error(`[${id}] ${err.code}: ${err.message}`, err.cause ?? '')
      return c.json(err.toBody(id), err.status)
    }
    // Unexpected errors are logged here, server-side only, and never detailed to the client.
    console.error(`[${id}] unhandled`, err)
    return c.json(new ApiError('server_error', 'The API hit an unexpected error while handling this request.').toBody(id), 500)
  })
  app.notFound((c) => c.json(new ApiError('not_found', `No API endpoint at ${c.req.method} ${c.req.path}.`).toBody(c.get('requestId')), 404))
  return app
}
