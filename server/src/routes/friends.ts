import type { FriendSearchResponse, FriendsView } from '@matchpoynt/shared'
import { Hono, type Context } from 'hono'
import { searchPeople } from '@/queries/directory'
import { acceptFriendRequest, deleteFriendship, loadFriendships, sendFriendRequest } from '@/queries/friends'
import { answerBlockedReason, friendRequestBlockedReason, friendsView, requestAction, withFriendStatus } from '@/utils/friends/rules'
import { conflict, notFound } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { body, currentUser, requireCompleteProfile, requireUser, resolveUser } from '@/utils/http/middleware'
import type { AppEnv } from '@/utils/http/types'
import { friendRequestSchema, friendSearchQuery, inviteAnswerSchema, uuidParam } from '@/utils/validation/schemas'

const requestGone = () => notFound('That friend request is no longer open. It may have been cancelled or answered on another device.')

function friendshipId(c: Context<AppEnv>): string {
  const parsed = uuidParam.safeParse(c.req.param('id'))
  if (!parsed.success) throw requestGone()
  return parsed.data
}

/** Every change answers with the whole Friends page, so the page only renders it. */
const respond = async (c: Context<AppEnv>) => {
  const view: FriendsView = friendsView(await loadFriendships(c.get('db')))
  return c.json(view)
}

/**
 * Friends: people on Matchpoynt (players, members and club owners alike)
 * adding each other. Signed-in accounts with a complete profile.
 */
export const friendRoutes = new Hono<AppEnv>()
  .use(requireFeature('web', 'signIn'))
  .use(requireFeature('web', 'friends'))
  .use(resolveUser)
  .use(requireUser)
  .use(requireCompleteProfile)
  .get('/', respond)
  // Up to 5 people by name, email or @username, each with where they stand with the caller.
  .get('/search', async (c) => {
    const parsed = friendSearchQuery.safeParse(c.req.query())
    const db = c.get('db')
    const people = parsed.success ? await searchPeople(db, parsed.data.q, null) : []
    const response: FriendSearchResponse = { people: people.length ? withFriendStatus(people, await loadFriendships(db)) : [] }
    c.header('Cache-Control', 'no-store')
    return c.json(response)
  })
  // Asking someone who already asked you accepts their request.
  .post('/', async (c) => {
    const { userId } = await body(c, friendRequestSchema)
    const db = c.get('db')
    const records = await loadFriendships(db)
    const blocked = friendRequestBlockedReason(currentUser(c).id, userId, records)
    if (blocked) throw conflict(blocked)
    const action = requestAction(userId, records)
    if (action === 'request') await sendFriendRequest(db, userId)
    else await acceptFriendRequest(db, action.accept)
    return respond(c)
  })
  .post('/:id', async (c) => {
    const id = friendshipId(c)
    const { accept } = await body(c, inviteAnswerSchema)
    const db = c.get('db')
    const blocked = answerBlockedReason(id, await loadFriendships(db))
    if (blocked) throw notFound(blocked)
    if (accept) await acceptFriendRequest(db, id)
    else await deleteFriendship(db, id)
    return respond(c)
  })
  // Removes a friend, or cancels a request the caller sent.
  .delete('/:id', async (c) => {
    if (!(await deleteFriendship(c.get('db'), friendshipId(c)))) throw requestGone()
    return respond(c)
  })
