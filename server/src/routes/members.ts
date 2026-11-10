import type { MemberSuggestionsResponse, SportId } from '@matchpoynt/shared'
import { Hono } from 'hono'
import { features } from '@/config/features'
import { findMembers, sessionForSuggestions } from '@/queries/clubs'
import { rankSuggestions } from '@/utils/club/suggest'
import { ApiError } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { resolveUser } from '@/utils/http/middleware'
import type { AppEnv } from '@/utils/http/types'
import { memberSuggestionQuery } from '@/utils/validation/schemas'

const shown = 8

/** Club members suggested while typing a player's name on the board or in session setup. */
export const memberRoutes = new Hono<AppEnv>()
  .use(requireFeature('web', 'clubs'))
  .use(resolveUser)
  .get('/suggestions', async (c) => {
    if (!c.get('user')) {
      if (features().web.signIn) throw new ApiError('unauthorized', 'Your sign-in has expired. Sign in again.')
      const empty: MemberSuggestionsResponse = { suggestions: [] }
      return c.json(empty)
    }
    const parsed = memberSuggestionQuery.safeParse({ ...c.req.query(), exclude: c.req.queries('exclude') ?? [] })
    if (!parsed.success) throw new ApiError('invalid', `Invalid suggestion request: ${parsed.error.issues[0]?.path.join('.')}.`)
    const { q, sportId, sessionId, exclude } = parsed.data
    const db = c.get('db')
    const session = sessionId ? await sessionForSuggestions(db, sessionId) : null
    const candidates = q.trim() ? await findMembers(db, q.trim(), sportId as SportId, 40) : []
    const response: MemberSuggestionsResponse = {
      suggestions: rankSuggestions(q, candidates, [...exclude, ...(session?.names ?? [])], session?.clubId ?? null, shown),
    }
    c.header('Cache-Control', 'no-store')
    return c.json(response)
  })
