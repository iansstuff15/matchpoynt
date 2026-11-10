import type { CheckInResponse, PublicLeaderboardView, PublicTournamentView } from '@matchpoynt/shared'
import { Hono } from 'hono'
import { features } from '@/config/features'
import { limits } from '@/config/limits'
import { loadPublicClubHistory } from '@/queries/clubBadges'
import { awardClubBadges, careerTotals } from '@/utils/club/badges'
import { checkInBySlug, loadCheckInRoster } from '@/queries/publicCheckIn'
import { loadPublicResults } from '@/queries/publicLeaderboard'
import { loadPublicTournament } from '@/queries/publicTournament'
import { conflict, notFound } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { body } from '@/utils/http/middleware'
import { computeLeaderboard, computeSpotlight, toMatchResult } from '@/utils/session/leaderboard'
import { isPublicSlug } from '@/utils/session/publish'
import { anonSupabase } from '@/utils/supabase/anon'
import { toTournamentView } from '@/utils/tournament/view'
import { checkInSchema } from '@/utils/validation/schemas'

const noCheckIn = 'This check-in link is not valid. Scan the QR code on the Queue Master’s screen again.'

/** Endpoints for anyone with a published leaderboard link or a check-in QR. No sign-in. */
export const publicRoutes = new Hono()
  .get('/sessions/:slug/leaderboard', requireFeature('web', 'publishSessions'), async (c) => {
    const slug = c.req.param('slug')
    if (!isPublicSlug(slug)) throw notFound('This leaderboard is not published.')
    const results = await loadPublicResults(anonSupabase(), slug)
    if (!results) throw notFound('This leaderboard is not published.')

    const names = new Map(results.players.map((p) => [p.id, p.name]))
    const badgesOn = features().web.clubs && features().web.clubBadges
    const clubBadges = badgesOn ? results.clubBadges : []
    const career = clubBadges.some((b) => b.scope === 'career') ? careerTotals(await loadPublicClubHistory(anonSupabase(), slug)) : new Map()
    const entries = awardClubBadges(computeLeaderboard(results.players, results.matches), clubBadges, career)
    const view: PublicLeaderboardView = {
      sportId: results.sportId,
      status: results.status,
      updatedAt: results.updatedAt,
      spotlight: computeSpotlight(entries, results.matches),
      entries,
      recentMatches: results.matches.slice(0, limits.recentMatches).map((m) => toMatchResult(m, names)),
      clubBadges,
    }
    c.header('Cache-Control', 'public, max-age=10')
    return c.json(view)
  })
  // A published tournament: the live bracket, standings and champion.
  .get('/tournaments/:slug', requireFeature('web', 'tournaments'), requireFeature('web', 'publishTournaments'), async (c) => {
    const slug = c.req.param('slug')
    if (!isPublicSlug(slug)) throw notFound('This tournament is not published.')
    const found = await loadPublicTournament(anonSupabase(), slug)
    if (!found) throw notFound('This tournament is not published.')
    const view: PublicTournamentView = {
      sportId: found.sportId,
      sessionStatus: found.status,
      updatedAt: found.updatedAt,
      tournament: toTournamentView(found.tournament, {
        name: (id) => found.names.get(id) ?? 'Removed player',
        courtLabels: [],
        publicUrl: null,
      }),
    }
    c.header('Cache-Control', 'public, max-age=10')
    return c.json(view)
  })
  // Check-in QR: the roster to pick your name from, then check in.
  .get('/check-in/:slug', async (c) => {
    const slug = c.req.param('slug')
    if (!isPublicSlug(slug)) throw notFound(noCheckIn)
    const roster = await loadCheckInRoster(anonSupabase(), slug)
    if (!roster) throw notFound(noCheckIn)
    c.header('Cache-Control', 'no-store')
    return c.json(roster)
  })
  .post('/check-in/:slug', async (c) => {
    const slug = c.req.param('slug')
    if (!isPublicSlug(slug)) throw notFound(noCheckIn)
    const { playerId } = await body(c, checkInSchema)
    const outcome = await checkInBySlug(anonSupabase(), slug, playerId)
    if (outcome.result !== 'ok') {
      if (outcome.result === 'closed') throw conflict('This session has ended, so check-in is closed.')
      if (outcome.result === 'unknown_player') throw notFound('That name is no longer on this session’s list. Ask the Queue Master to add you.')
      throw notFound(noCheckIn)
    }
    const response: CheckInResponse = { name: outcome.name }
    return c.json(response)
  })
