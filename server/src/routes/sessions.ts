import type { ActiveSessionsResponse, CheckInLinkResponse, EndedSessionResponse, EndedSessionsResponse, LatestEndedSessionResponse, TournamentPublishResponse, LeaderboardView, PublishResponse, SessionView } from '@matchpoynt/shared'
import { Hono, type Context } from 'hono'
import { limits } from '@/config/limits'
import type { EngineContext, SessionState } from '@/interfaces/SessionState'
import { engineContext } from '@/utils/session/context'
import { loadBadgeRows, loadClubHistory, toBadgeView } from '@/queries/clubBadges'
import { awardClubBadges, careerTotals } from '@/utils/club/badges'
import { deleteSession, endSession, ensureCheckInSlug, listEndedSessions, loadSessionClubId, listActiveSessions, loadEndedSession, loadLatestEndedSession, loadResults, loadSession, saveCancelledMatch, saveRestartedSession, saveSession, setPublicSlug, setTournamentSlug } from '@/queries/sessions'
import { ApiError, conflict, invalid, notFound } from '@/utils/http/errors'
import { features } from '@/config/features'
import { requireFeature } from '@/utils/http/feature'
import { body, currentUser, expectedVersion, requireCompleteProfile, requireUser, resolveUser } from '@/utils/http/middleware'
import type { AppEnv } from '@/utils/http/types'
import { addCourt, addPlayer, endBlockedReason, assignPlayer, cancelMatch, checkInPlayer, finishMatch, openMatchFor, removeCourt, removePlayer, restartMatch, restartSession, settleCheckIns, startMatch, unassignPlayer } from '@/utils/session/engine'
import { checkInUrl } from '@/utils/session/checkIn'
import { computeLeaderboard, computeSpotlight, toMatchResult } from '@/utils/session/leaderboard'
import { newPublicSlug, publicUrl } from '@/utils/session/publish'
import { applySetup, createSession } from '@/utils/session/setup'
import { toSessionView } from '@/utils/session/view'
import { cancelTournament, createTournament, setCourtTournament, setTournamentCompetitors, startTournamentMatch } from '@/utils/tournament/setup'
import { tournamentUrl } from '@/utils/tournament/publish'
import {
  addPlayerSchema,
  assignPlayerSchema,
  endedSessionsQuery,
  courtTournamentSchema,
  tournamentCompetitorsSchema,
  finishMatchSchema,
  setupSchema,
  tournamentMatchParam,
  tournamentSetupSchema,
  uuidParam,
} from '@/utils/validation/schemas'


function idParam(c: Context, name: string): string {
  const parsed = uuidParam.safeParse(c.req.param(name))
  if (!parsed.success) throw notFound('Not found.')
  return parsed.data
}

/** Loads the session, checks the client's version, applies `change`, saves and returns the new view. */
async function mutate(c: Context<AppEnv>, change: (state: SessionState, ctx: EngineContext) => SessionState) {
  const version = expectedVersion(c)
  const db = c.get('db')
  const loaded = await loadSession(db, idParam(c, 'id'))
  if (!loaded) throw notFound('Session not found.')
  if (loaded.version !== version) throw conflict('The board changed somewhere else. It has been refreshed.')

  // QR check-ins since the last change join the queue first.
  const next = change(settleCheckIns(loaded), engineContext())
  const saved = await saveSession(db, next, version)
  const view: SessionView = toSessionView({ ...next, version: saved })
  return c.json(view)
}

const signInExpired = () => new ApiError('unauthorized', 'Your sign-in has expired. Sign in again to get back to your session.')

export const sessionRoutes = new Hono<AppEnv>()
  .use(resolveUser)
  // A guest with no user yet simply has no session. With sign-in on, no user
  // means the sign-in expired: say so, so the web app sends them to sign in.
  .get('/active', async (c) => {
    if (!c.get('user') && features().web.signIn) throw signInExpired()
    const response: ActiveSessionsResponse = { sessions: c.get('user') ? await listActiveSessions(c.get('db')) : [] }
    return c.json(response)
  })
  // The last finished session, shown with its leaderboard until the next one starts.
  .get('/latest-ended', async (c) => {
    if (!c.get('user') && features().web.signIn) throw signInExpired()
    const response: LatestEndedSessionResponse = { session: c.get('user') ? await loadLatestEndedSession(c.get('db')) : null }
    return c.json(response)
  })
  // A finished session by its link, so its leaderboard can be found again after newer sessions.
  // Every finished session, newest first, a page at a time: their pages keep the final leaderboard.
  .get('/ended', async (c) => {
    if (!c.get('user') && features().web.signIn) throw signInExpired()
    const parsed = endedSessionsQuery.safeParse(c.req.query())
    if (!parsed.success) throw invalid('The page of past sessions asked for is not valid. Reload the list.', { before: 'Not a date' })
    const response: EndedSessionsResponse = c.get('user') ? await listEndedSessions(c.get('db'), parsed.data.before ?? null) : { sessions: [], nextBefore: null }
    return c.json(response)
  })
  .get('/:id/ended', async (c) => {
    if (!c.get('user') && features().web.signIn) throw signInExpired()
    const id = idParam(c, 'id')
    const db = c.get('db')
    const session = c.get('user') ? await loadEndedSession(db, id) : null
    if (!session) {
      if (c.get('user') && (await loadSession(db, id))) throw conflict('This session is still running. It is on the session board.')
      throw notFound('Session not found. The link may be wrong, or the session belongs to another account.')
    }
    const response: EndedSessionResponse = { session }
    return c.json(response)
  })
  .post('/', requireUser, requireCompleteProfile, async (c) => {
    const input = await body(c, setupSchema)
    const db = c.get('db')
    const state = createSession(currentUser(c).id, input, engineContext())
    const version = await saveSession(db, state, null)
    return c.json(toSessionView({ ...state, version }), 201)
  })
  .use('/:id/*', requireUser, requireCompleteProfile)
  .put('/:id/setup', async (c) => {
    const input = await body(c, setupSchema)
    return mutate(c, (state, ctx) => applySetup(state, input, ctx))
  })
  // A running session's board.
  .get('/:id', async (c) => {
    if (!c.get('user') && features().web.signIn) throw signInExpired()
    const state = await loadSession(c.get('db'), idParam(c, 'id'))
    if (!state) throw notFound('Session not found. The link may be wrong, or the session belongs to another account.')
    if (state.status !== 'active') throw conflict('This session has ended. Its results are on its page.')
    return c.json(toSessionView(settleCheckIns(state)))
  })
  // Deletes a session for good, running or finished: board, players, results and its published links.
  // Unlike finishing, nothing is kept, so the web app always confirms first.
  .delete('/:id', requireUser, async (c) => {
    if (!(await deleteSession(c.get('db'), idParam(c, 'id')))) throw notFound('Session not found. It may already have been deleted.')
    return c.body(null, 204)
  })
  // Only once every match is finished, so no result is lost.
  .post('/:id/end', async (c) => {
    const db = c.get('db')
    const state = await loadSession(db, idParam(c, 'id'))
    if (!state) throw notFound('Session not found.')
    const blocked = endBlockedReason(state)
    if (blocked) throw conflict(blocked)
    await endSession(db, state.id, expectedVersion(c))
    return c.body(null, 204)
  })
  .post('/:id/players', async (c) => {
    const input = await body(c, addPlayerSchema)
    return mutate(c, (state, ctx) => addPlayer(state, input, ctx))
  })
  .post('/:id/players/:playerId/check-in', (c) => mutate(c, (state, ctx) => checkInPlayer(state, idParam(c, 'playerId'), ctx)))
  .delete('/:id/players/:playerId', (c) => mutate(c, (state) => removePlayer(state, idParam(c, 'playerId'))))
  .post('/:id/courts', (c) => mutate(c, (state, ctx) => addCourt(state, ctx)))
  // Removes a court with no match on it (save_session deletes courts left out of the save).
  .delete('/:id/courts/:courtId', (c) => mutate(c, (state) => removeCourt(state, idParam(c, 'courtId'))))
  // Manual placement: drag a player onto a side of an open court, or back to the queue.
  .post('/:id/courts/:courtId/lineup', async (c) => {
    const { playerId, side } = await body(c, assignPlayerSchema)
    return mutate(c, (state) => assignPlayer(state, idParam(c, 'courtId'), playerId, side))
  })
  .delete('/:id/players/:playerId/lineup', (c) => mutate(c, (state) => unassignPlayer(state, idParam(c, 'playerId'))))
  .post('/:id/courts/:courtId/start', (c) => mutate(c, (state, ctx) => startMatch(state, idParam(c, 'courtId'), ctx)))
  // Replays a court's match from the start: same players and sides, the clock back to zero.
  .post('/:id/courts/:courtId/restart', (c) => mutate(c, (state, ctx) => restartMatch(state, idParam(c, 'courtId'), ctx)))
  // Cancels a court's match: no result, its players back to the queue, the court open.
  .post('/:id/courts/:courtId/cancel', async (c) => {
    const version = expectedVersion(c)
    const db = c.get('db')
    const loaded = await loadSession(db, idParam(c, 'id'))
    if (!loaded) throw notFound('Session not found.')
    if (loaded.version !== version) throw conflict('The board changed somewhere else. It has been refreshed.')
    const before = settleCheckIns(loaded)
    const courtId = idParam(c, 'courtId')
    const match = openMatchFor(before, courtId)
    const next = cancelMatch(before, courtId)
    const saved = await saveCancelledMatch(db, next, version, match!.id)
    return c.json(toSessionView({ ...next, version: saved }))
  })
  // Starts the whole session over, keeping its setup: every result is deleted, everyone back to the queue.
  .post('/:id/restart', async (c) => {
    const version = expectedVersion(c)
    const db = c.get('db')
    const loaded = await loadSession(db, idParam(c, 'id'))
    if (!loaded) throw notFound('Session not found.')
    if (loaded.version !== version) throw conflict('The board changed somewhere else. It has been refreshed.')
    const next = restartSession(settleCheckIns(loaded), engineContext())
    const saved = await saveRestartedSession(db, next, version)
    return c.json(toSessionView({ ...next, version: saved }))
  })
  .post('/:id/courts/:courtId/finish', async (c) => {
    const { games } = await body(c, finishMatchSchema)
    return mutate(c, (state, ctx) => finishMatch(state, idParam(c, 'courtId'), games, ctx))
  })
  // The check-in QR's link. Made the first time it's opened, then kept, so a printed QR keeps working.
  .post('/:id/check-in', async (c) => {
    const slug = await ensureCheckInSlug(c.get('db'), idParam(c, 'id'), newPublicSlug())
    const response: CheckInLinkResponse = { checkInUrl: checkInUrl(slug)! }
    return c.json(response)
  })
  .post('/:id/publish', requireFeature('web', 'publishSessions'), async (c) => {
    const db = c.get('db')
    const state = await loadSession(db, idParam(c, 'id'))
    if (!state) throw notFound('Session not found.')
    // Publishing twice keeps the same link, so links already shared keep working.
    const slug = state.publicSlug ?? (await setPublicSlug(db, state.id, newPublicSlug()))
    const response: PublishResponse = { publicUrl: publicUrl(slug) }
    return c.json(response)
  })
  .delete('/:id/publish', requireFeature('web', 'publishSessions'), async (c) => {
    await setPublicSlug(c.get('db'), idParam(c, 'id'), null)
    const response: PublishResponse = { publicUrl: null }
    return c.json(response)
  })
  // Tournaments: switching the first court on sets one up; more courts join or leave it.
  .post('/:id/tournament', requireFeature('web', 'tournaments'), async (c) => {
    const input = await body(c, tournamentSetupSchema)
    return mutate(c, (state, ctx) => createTournament(state, input, ctx))
  })
  .delete('/:id/tournament', requireFeature('web', 'tournaments'), (c) => mutate(c, (state, ctx) => cancelTournament(state, ctx)))
  // Who competes in the running tournament, before it starts: the draw is made again.
  .put('/:id/tournament/competitors', requireFeature('web', 'tournaments'), async (c) => {
    const { playerIds } = await body(c, tournamentCompetitorsSchema)
    return mutate(c, (state, ctx) => setTournamentCompetitors(state, playerIds, ctx))
  })
  .put('/:id/courts/:courtId/tournament', requireFeature('web', 'tournaments'), async (c) => {
    const { on } = await body(c, courtTournamentSchema)
    return mutate(c, (state, ctx) => setCourtTournament(state, idParam(c, 'courtId'), on, ctx))
  })
  .post('/:id/tournament/matches/:matchId/start', requireFeature('web', 'tournaments'), (c) => {
    const parsed = tournamentMatchParam.safeParse(c.req.param('matchId'))
    if (!parsed.success) throw notFound('That match is not in this tournament.')
    return mutate(c, (state, ctx) => startTournamentMatch(state, parsed.data, ctx))
  })
  .post('/:id/tournament/publish', requireFeature('web', 'tournaments'), requireFeature('web', 'publishTournaments'), async (c) => {
    const db = c.get('db')
    const state = await loadSession(db, idParam(c, 'id'))
    if (!state) throw notFound('Session not found.')
    if (!state.tournament) throw conflict('This session has no tournament to publish.')
    // Publishing twice keeps the same link, so links already shared keep working.
    const slug = state.tournamentSlug ?? (await setTournamentSlug(db, state.id, newPublicSlug()))
    const response: TournamentPublishResponse = { publicUrl: tournamentUrl(slug) }
    return c.json(response)
  })
  .delete('/:id/tournament/publish', requireFeature('web', 'tournaments'), requireFeature('web', 'publishTournaments'), async (c) => {
    await setTournamentSlug(c.get('db'), idParam(c, 'id'), null)
    const response: TournamentPublishResponse = { publicUrl: null }
    return c.json(response)
  })
  .get('/:id/leaderboard', async (c) => {
    const id = idParam(c, 'id')
    const db = c.get('db')
    const state = await loadSession(db, id)
    if (!state) throw notFound('Session not found.')
    const { players, matches } = await loadResults(db, id)
    const names = new Map(players.map((p) => [p.id, p.name]))
    // Badges of the club that runs the session, if any (planned in a club and club badges on).
    const clubId = features().web.clubs && features().web.clubBadges ? await loadSessionClubId(db, id) : null
    const [badgeRows, history] = clubId ? await Promise.all([loadBadgeRows(db, clubId), loadClubHistory(db, clubId)]) : [[], null]
    const clubBadges = badgeRows.map(toBadgeView)
    const entries = awardClubBadges(computeLeaderboard(players, matches), clubBadges, history ? careerTotals(history) : new Map())
    const response: LeaderboardView = {
      sessionId: id,
      spotlight: computeSpotlight(entries, matches),
      entries,
      recentMatches: matches.slice(0, limits.recentMatches).map((m) => toMatchResult(m, names)),
      clubBadges,
    }
    return c.json(response)
  })

