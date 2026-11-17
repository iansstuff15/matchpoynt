import { signUpLimits } from '@matchpoynt/shared'
import type { UpcomingSessionView, ClubBadgeView, LeaderboardView, PlayerLiveListResponse, PlayerLiveView, PlayerSessionResponse } from '@matchpoynt/shared'
import { Hono, type Context } from 'hono'
import { loadUpcomingPlans } from '@/queries/directory'
import { loadFriendships } from '@/queries/friends'
import { loadPlayerEnded, loadPlayerLive, loadPlayerLiveSessions, playerCheckIn, setOwnBreak } from '@/queries/playerLive'
import { conflict, notFound } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { body, requireUser, resolveUser } from '@/utils/http/middleware'
import type { AppEnv } from '@/utils/http/types'
import { breakBlockedReason, settleCheckIns } from '@/utils/session/engine'
import { leaderboardView } from '@/utils/session/leaderboardView'
import { playerLiveView, type PlayerViewAwards } from '@/utils/session/playerView'
import { careerKey, careerTotals, type ClubHistory } from '@/utils/club/badges'
import { features } from '@/config/features'
import { breakSchema, uuidParam } from '@/utils/validation/schemas'

/** The viewer's friends' usernames, to say which are at the session; none while friends are off. */
async function friendNames(c: Context<AppEnv>): Promise<string[]> {
  if (!features().web.friends) return []
  const records = await loadFriendships(c.get('db'))
  return records.filter((r) => r.status === 'accepted' && r.person.username).map((r) => r.person.username!)
}

const sessionGone = () => notFound("That session isn't one of your clubs' sessions, or it has been removed.")

/** The club's own badges and its history, while club badges are on; none otherwise. */
const awards = (live: { clubBadges: ClubBadgeView[]; clubHistory: ClubHistory }): PlayerViewAwards =>
  features().web.clubBadges ? { clubBadges: live.clubBadges, clubHistory: live.clubHistory } : { clubBadges: [], clubHistory: { players: [], matches: [] } }

/** The running club session the caller is in, or 404. */
async function liveSession(c: Context<AppEnv>) {
  const id = uuidParam.safeParse(c.req.param('sessionId'))
  if (!id.success) throw sessionGone()
  const live = await loadPlayerLive(c.get('db'), id.data)
  if (!live) throw sessionGone()
  return live
}

/**
 * Players' live view of their club's running sessions: how long they've
 * waited, who's on court, who plays next and the queue. Read only; the
 * board stays the Queue Master's.
 */
export const playRoutes = new Hono<AppEnv>()
  .use(requireFeature('web', 'clubs'))
  .use(requireFeature('web', 'signIn'))
  .use(requireFeature('web', 'clubDirectory'))
  .use(requireFeature('web', 'playerView'))
  .use(resolveUser)
  .use(requireUser)
  .get('/', async (c) => {
    const db = c.get('db')
    const sessions = await loadPlayerLiveSessions(db)
    // Where they stand in each (playing, up next, waiting…), as its live view works it out, so the app can light Playing now while they're on court.
    const statuses = await Promise.all(
      sessions.map(async (s) => {
        const live = await loadPlayerLive(db, s.sessionId)
        return live ? (playerLiveView(settleCheckIns(live.state), live.club, live.memberName, live.finished, Date.now(), awards(live)).me?.status ?? 'not_in_session') : 'not_in_session'
      }),
    )
    const response: PlayerLiveListResponse = { sessions: sessions.map((s, i) => ({ ...s, status: statuses[i]! })) }
    c.header('Cache-Control', 'no-store')
    return c.json(response)
  })
  // Planned sessions they're signed up for that start soon: the in-app reminder on Playing now.
  .get('/upcoming', async (c) => {
    const response: UpcomingSessionView[] = await loadUpcomingPlans(c.get('db'), signUpLimits.reminderWindowHours)
    c.header('Cache-Control', 'no-store')
    return c.json(response)
  })
  .get('/:sessionId', async (c) => {
    // Once it has ended, its players get its ended screen (where they give the club feedback) instead.
    const id = uuidParam.safeParse(c.req.param('sessionId'))
    if (!id.success) throw sessionGone()
    const ended = await loadPlayerEnded(c.get('db'), id.data)
    if (ended) {
      c.header('Cache-Control', 'no-store')
      const response: PlayerSessionResponse = ended
      return c.json(response)
    }
    const live = await liveSession(c)
    if (live.state.status !== 'active') throw sessionGone()
    // Check-ins recorded at the venue join the queue, as they do on the board.
    const view: PlayerLiveView = playerLiveView(settleCheckIns(live.state), live.club, live.memberName, live.finished, Date.now(), awards(live), await friendNames(c))
    c.header('Cache-Control', 'no-store')
    return c.json(view)
  })
  // Checking in from the app, as scanning the session's QR at the venue does; answers with the refreshed view.
  .post('/:sessionId/check-in', async (c) => {
    const id = uuidParam.safeParse(c.req.param('sessionId'))
    if (!id.success) throw sessionGone()
    const result = await playerCheckIn(c.get('db'), id.data)
    if (result === 'closed') throw conflict('This session has ended, so check-in is closed.')
    if (result === 'not_on_roster') throw notFound("You're not on this session's roster. Ask the Queue Master to add you.")
    const live = await liveSession(c)
    const view: PlayerLiveView = playerLiveView(settleCheckIns(live.state), live.club, live.memberName, live.finished, Date.now(), awards(live), await friendNames(c))
    return c.json(view)
  })
  // A player starts or ends their own break: they sit out the queue until they're back.
  .post('/:sessionId/break', async (c) => {
    const { onBreak } = await body(c, breakSchema)
    const live = await liveSession(c)
    const state = settleCheckIns(live.state)
    const me = live.memberName ? Object.values(state.players).find((p) => p.active && careerKey(p.name) === careerKey(live.memberName!)) : undefined
    if (!me) throw notFound("You're not on this session's roster. Ask the Queue Master to add you.")
    const blocked = breakBlockedReason(state, me.id, onBreak)
    if (blocked) throw conflict(blocked.replace(`${me.name} is`, "You're").replace(`${me.name} isn't`, "You're not").replace(`${me.name} hasn't`, "You haven't").replace(`${me.name} is still`, "You're still"))
    await setOwnBreak(c.get('db'), live.state.id, onBreak)
    const after = await liveSession(c)
    const view: PlayerLiveView = playerLiveView(settleCheckIns(after.state), after.club, after.memberName, after.finished, Date.now(), awards(after), await friendNames(c))
    return c.json(view)
  })
  // The session's leaderboard, as the board's Leaderboard tab ranks it, with the club's own badges; while it runs, and its final one after.
  .get('/:sessionId/leaderboard', async (c) => {
    const live = await liveSession(c)
    const { state, finished, memberName, club, clubAvatarUrl } = live
    const newestFirst = [...finished].sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
    const { clubBadges, clubHistory } = awards(live)
    // The club's finished sessions already include this one once it has ended; while it runs, it's added.
    const running = state.status === 'active'
    const career = careerTotals({
      players: [...clubHistory.players, ...(running ? Object.values(state.players).map((p) => ({ id: p.id, sessionId: state.id, name: p.name })) : [])],
      matches: [...clubHistory.matches, ...(running ? finished : [])],
    })
    // The viewer is the player with their name on the club's roster, as in the live view.
    const response: LeaderboardView = leaderboardView(state.id, Object.values(state.players), newestFirst, clubBadges, career, memberName, { name: club.name, avatarUrl: clubAvatarUrl })
    c.header('Cache-Control', 'no-store')
    return c.json(response)
  })
