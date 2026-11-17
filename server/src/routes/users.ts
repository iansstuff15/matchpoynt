import type { PersonProfileView } from '@matchpoynt/shared'
import { Hono } from 'hono'
import { features } from '@/config/features'
import { loadFriendships } from '@/queries/friends'
import { loadPersonProfile } from '@/queries/people'
import { friendStatus } from '@/utils/friends/rules'
import { notFound } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { currentUser, requireCompleteProfile, requireUser, resolveUser } from '@/utils/http/middleware'
import type { AppEnv } from '@/utils/http/types'
import { handleProblem, normalizeHandle } from '@/utils/social/handles'

const nobody = () => notFound("There's nobody on Matchpoynt with that username.")

/** People's public profiles (`/u/<username>`), for anyone signed in with a complete profile. */
export const userRoutes = new Hono<AppEnv>()
  .use(requireFeature('web', 'signIn'))
  .use(resolveUser)
  .use(requireUser)
  .use(requireCompleteProfile)
  .get('/:username', async (c) => {
    const username = normalizeHandle(c.req.param('username'))
    if (handleProblem(username, 'username')) throw nobody()
    const db = c.get('db')
    const profile = await loadPersonProfile(db, username, features().web.clubs)
    if (!profile) throw nobody()
    const isMe = profile.userId === currentUser(c).id
    let friend: PersonProfileView['friend'] = null
    if (!isMe && features().web.friends) {
      const record = (await loadFriendships(db)).find((r) => r.person.userId === profile.userId)
      friend = { status: friendStatus(record), friendshipId: record?.id ?? null }
    }
    const view: PersonProfileView = { ...profile, isMe, friend }
    c.header('Cache-Control', 'no-store')
    return c.json(view)
  })
