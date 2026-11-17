import { loadJoinCard } from '@/queries/directory'
import { handleParam } from '@/utils/validation/schemas'
import type { CheckInResponse, PublicLeaderboardView, PublicTournamentView } from '@matchpoynt/shared'
import { Hono } from 'hono'
import { features } from '@/config/features'
import { limits } from '@/config/limits'
import { loadPublicClubHistory } from '@/queries/clubBadges'
import { awardClubBadges, careerTotals } from '@/utils/club/badges'
import { checkInBySlug, loadCheckInRoster } from '@/queries/publicCheckIn'
import { loadPublicResults, loadPublicSessionClub } from '@/queries/publicLeaderboard'
import { mediaUrl } from '@/utils/club/media'
import { loadPublicTournament } from '@/queries/publicTournament'
import { conflict, notFound } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { body } from '@/utils/http/middleware'
import { computeLeaderboard, computeSpotlight, toMatchResult } from '@/utils/session/leaderboard'
import { viewerPlayerId } from '@/utils/session/leaderboardView'
import { viewerUsername } from '@/queries/profiles'
import { readSession } from '@/utils/auth/session'
import { supabaseAs } from '@/utils/supabase/client'
import { isPublicSlug } from '@/utils/session/publish'
import { anonSupabase } from '@/utils/supabase/anon'
import { toTournamentView } from '@/utils/tournament/view'
import { checkInSchema } from '@/utils/validation/schemas'

const noCheckIn = 'This check-in link is not valid. Scan the QR code on the Queue Master’s screen again.'

/** Endpoints for anyone with a published leaderboard link or a check-in QR. No sign-in. */
export const publicRoutes = new Hono()
  // A club's join page (the club QR's link), readable signed out: its name, photos and size.
  .get('/clubs/:handle', requireFeature('web', 'clubs'), requireFeature('web', 'clubDirectory'), async (c) => {
    const handle = handleParam.safeParse(c.req.param('handle'))
    const card = handle.success ? await loadJoinCard(handle.data) : null
    if (!card) throw notFound('No club has that handle. The link may be wrong, or the club changed its handle.')
    return c.json(card)
  })
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
    // Someone signed in viewing it can make share images of their own entry; the answer then varies by viewer.
    const session = await readSession(c)
    const viewer = session ? await viewerUsername(supabaseAs(session.tokens.idToken), session.user) : null
    const club = features().web.clubs ? await loadPublicSessionClub(anonSupabase(), slug) : null
    const view: PublicLeaderboardView = {
      viewerPlayerId: viewerPlayerId(results.players, viewer),
      club: club && { name: club.name, avatarUrl: mediaUrl(club.avatarPath) },
      sportId: results.sportId,
      status: results.status,
      updatedAt: results.updatedAt,
      spotlight: computeSpotlight(entries, results.matches),
      entries,
      recentMatches: results.matches.slice(0, limits.recentMatches).map((m) => toMatchResult(m, names)),
      clubBadges,
    }
    c.header('Cache-Control', session ? 'private, no-store' : 'public, max-age=10')
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
