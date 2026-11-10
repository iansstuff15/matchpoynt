import { randomUUID } from 'node:crypto'
import type {
  ActiveSessionSummary,
  ClubBadgeView,
  EndedSessionsResponse,
  EndedSessionView,
  LeaderboardView,
  SessionView,
} from '@matchpoynt/shared'
import { sessionHistory, sportRules } from '@matchpoynt/shared'
import type { ZodType } from 'zod'
import { limits } from '@/config/limits'
import type { EngineContext, SessionState } from '@/interfaces/SessionState'
import { ApiError, conflict, invalid, notFound } from '@/utils/http/errors'
import {
  addCourt,
  addPlayer,
  assignPlayer,
  cancelMatch,
  checkInPlayer,
  endBlockedReason,
  finishMatch,
  removeCourt,
  removePlayer,
  restartMatch,
  restartSession,
  settleCheckIns,
  startMatch,
  unassignPlayer,
} from '@/utils/session/engine'
import { awardClubBadges, careerTotals, type ClubHistory } from '@/utils/club/badges'
import { computeLeaderboard, computeSpotlight, toMatchResult } from '@/utils/session/leaderboard'
import { applySetup, createSession } from '@/utils/session/setup'
import { toSessionView } from '@/utils/session/view'
import { cancelTournament, createTournament, setCourtTournament, setTournamentCompetitors, startTournamentMatch } from '@/utils/tournament/setup'
import {
  addPlayerSchema,
  assignPlayerSchema,
  courtTournamentSchema,
  finishMatchSchema,
  setupSchema,
  tournamentCompetitorsSchema,
  tournamentMatchParam,
  tournamentSetupSchema,
} from '@/utils/validation/schemas'

/** What a fake route answers: a status and a JSON body (`undefined` for 204). */
export interface FakeResponse {
  status: number
  body?: unknown
}

interface Stored {
  state: SessionState
  createdAt: string
  endedAt: string | null
  /** The club that runs it (as when a planned session is started); `null` from the board. */
  clubId: string | null
}

/**
 * The session part of the API, in memory, for UI tests. It runs the API's
 * real rules (`server/src/utils/session/`: engine, setup, view, leaderboard)
 * and validation schemas exactly as `server/src/routes/sessions.ts` does,
 * so the board, queue and leaderboard behave as they do against the real
 * API. Only storage is replaced: no Supabase.
 */
export class FakeSessions {
  private readonly sessions = new Map<string, Stored>()
  /** The club's badges, from the fake clubs (for leaderboards). */
  badgesFor: (clubId: string) => ClubBadgeView[] = () => []

  /** Runs a session in a club, as starting one of the club's planned sessions does. */
  assignClub(sessionId: string, clubId: string) {
    const stored = this.sessions.get(sessionId)
    if (!stored) throw new Error(`No fake session ${sessionId}`)
    stored.clubId = clubId
    stored.state = { ...stored.state, clubId }
  }

  /** Every session the club has run: players and finished matches, as `loadClubHistory` returns them. */
  history(clubId: string): ClubHistory {
    const runs = [...this.sessions.values()].filter((s) => s.clubId === clubId)
    return {
      players: runs.flatMap(({ state }) => Object.values(state.players).map((p) => ({ id: p.id, sessionId: state.id, name: p.name }))),
      matches: runs.flatMap(({ state }) => finished(state)),
    }
  }

  private context(): EngineContext {
    return { now: Date.now(), newId: randomUUID, random: Math.random }
  }

  /** Answers `method path` (path without `/api`), or `null` if it isn't a session route. */
  handle(method: string, path: string, headers: Record<string, string>, raw: string | null): FakeResponse | null {
    try {
      return this.route(method, path, headers, raw)
    } catch (error) {
      if (error instanceof ApiError) return { status: error.status, body: error.toBody('test-request') }
      throw error
    }
  }

  private route(method: string, path: string, headers: Record<string, string>, raw: string | null): FakeResponse | null {
    if (method === 'GET' && path === '/sessions/active') return ok({ sessions: this.active() })
    if (method === 'GET' && path === '/sessions/latest-ended') return ok({ session: this.latestEnded() })
    if (method === 'GET' && path === '/sessions/ended') return ok(this.endedPage(null))
    if (method === 'GET' && path.startsWith('/sessions/ended?')) return ok(this.endedPage(new URLSearchParams(path.split('?')[1]).get('before')))
    if (method === 'POST' && path === '/sessions') {
      const state = createSession('test-owner', parse(setupSchema, raw), this.context())
      this.sessions.set(state.id, { state: { ...state, version: 1 }, createdAt: new Date().toISOString(), endedAt: null, clubId: null })
      return { status: 201, body: toSessionView({ ...state, version: 1 }) }
    }

    const match = /^\/sessions\/([^/]+)(\/.*)?$/.exec(path)
    if (!match) return null
    const id = match[1]!
    const rest = match[2] ?? ''
    const stored = this.sessions.get(id)
    if (!stored) throw notFound('Session not found.')
    const mutate = (change: (state: SessionState, ctx: EngineContext) => SessionState) => this.mutate(stored, headers, change)

    if (method === 'DELETE' && rest === '') {
      // Courts, players and matches go with it, as the database's cascades do.
      this.sessions.delete(id)
      return { status: 204 }
    }
    if (method === 'GET' && rest === '') {
      if (stored.state.status !== 'active') throw conflict('This session has ended. Its results are on its page.')
      return ok(toSessionView(settleCheckIns(stored.state)))
    }
    if (method === 'GET' && rest === '/ended') {
      if (stored.state.status === 'active') throw conflict('This session is still running. It is on the session board.')
      return ok({ session: this.endedView(stored) })
    }
    if (method === 'GET' && rest === '/leaderboard') return ok(this.leaderboard(stored))
    if (method === 'PUT' && rest === '/setup') return mutate((s, ctx) => applySetup(s, parse(setupSchema, raw), ctx))
    if (method === 'POST' && rest === '/end') {
      const blocked = endBlockedReason(stored.state)
      if (blocked) throw conflict(blocked)
      stored.state = { ...stored.state, status: 'ended', version: stored.state.version + 1 }
      stored.endedAt = new Date().toISOString()
      return { status: 204 }
    }
    if (method === 'POST' && rest === '/players') return mutate((s, ctx) => addPlayer(s, parse(addPlayerSchema, raw), ctx))
    if (method === 'POST' && rest === '/courts') return mutate((s, ctx) => addCourt(s, ctx))
    // Tournaments, as routes/sessions.ts: the API's own bracket and progress rules.
    if (method === 'POST' && rest === '/tournament') return mutate((s, ctx) => createTournament(s, parse(tournamentSetupSchema, raw), ctx))
    if (method === 'DELETE' && rest === '/tournament') return mutate((s, ctx) => cancelTournament(s, ctx))
    if (method === 'PUT' && rest === '/tournament/competitors') return mutate((s, ctx) => setTournamentCompetitors(s, parse(tournamentCompetitorsSchema, raw).playerIds, ctx))
    // Here state keeps finished matches too, so dropping them from it clears the results, as restart_session does in SQL.
    if (method === 'POST' && rest === '/restart') return mutate((s, ctx) => restartSession(s, ctx))

    let m: RegExpExecArray | null
    if (method === 'DELETE' && (m = /^\/courts\/([^/]+)$/.exec(rest))) return mutate((s) => removeCourt(s, m![1]!))
    if (method === 'POST' && (m = /^\/players\/([^/]+)\/check-in$/.exec(rest))) return mutate((s, ctx) => checkInPlayer(s, m![1]!, ctx))
    if (method === 'DELETE' && (m = /^\/players\/([^/]+)\/lineup$/.exec(rest))) return mutate((s) => unassignPlayer(s, m![1]!))
    if (method === 'DELETE' && (m = /^\/players\/([^/]+)$/.exec(rest))) return mutate((s) => removePlayer(s, m![1]!))
    if (method === 'POST' && (m = /^\/courts\/([^/]+)\/lineup$/.exec(rest))) {
      const { playerId, side } = parse(assignPlayerSchema, raw)
      return mutate((s) => assignPlayer(s, m![1]!, playerId, side))
    }
    if (method === 'POST' && (m = /^\/courts\/([^/]+)\/start$/.exec(rest))) return mutate((s, ctx) => startMatch(s, m![1]!, ctx))
    if (method === 'POST' && (m = /^\/courts\/([^/]+)\/restart$/.exec(rest))) return mutate((s, ctx) => restartMatch(s, m![1]!, ctx))
    // State here holds the match, so dropping it from state is the delete cancel_match does in SQL.
    if (method === 'POST' && (m = /^\/courts\/([^/]+)\/cancel$/.exec(rest))) return mutate((s) => cancelMatch(s, m![1]!))
    if (method === 'PUT' && (m = /^\/courts\/([^/]+)\/tournament$/.exec(rest))) {
      const { on } = parse(courtTournamentSchema, raw)
      return mutate((s, ctx) => setCourtTournament(s, m![1]!, on, ctx))
    }
    if (method === 'POST' && (m = /^\/tournament\/matches\/([^/]+)\/start$/.exec(rest))) {
      const matchId = tournamentMatchParam.parse(decodeURIComponent(m[1]!))
      return mutate((s, ctx) => startTournamentMatch(s, matchId, ctx))
    }
    if (method === 'POST' && (m = /^\/courts\/([^/]+)\/finish$/.exec(rest))) {
      const { games } = parse(finishMatchSchema, raw)
      return mutate((s, ctx) => finishMatch(s, m![1]!, games, ctx))
    }
    return null
  }

  /** Same order as the API: version check, settle QR check-ins, apply the rule, save, answer with the view. */
  private mutate(stored: Stored, headers: Record<string, string>, change: (state: SessionState, ctx: EngineContext) => SessionState): FakeResponse {
    const version = Number(headers['if-match'])
    if (!Number.isInteger(version)) throw invalid('Missing If-Match: the board version this change is based on.')
    if (stored.state.version !== version) throw conflict('The board changed somewhere else. It has been refreshed.')
    const next = { ...change(settleCheckIns(stored.state), this.context()), version: version + 1 }
    stored.state = next
    return ok(toSessionView(next) satisfies SessionView)
  }

  private active(): ActiveSessionSummary[] {
    return [...this.sessions.values()]
      .filter(({ state }) => state.status === 'active')
      .reverse()
      .map(({ state, createdAt }) => ({
        id: state.id,
        label: state.title ?? `${sportRules[state.settings.sportId].name} session`,
        sportId: state.settings.sportId,
        startedAt: createdAt,
        courts: state.courts.length,
        playing: state.courts.filter((c) => c.status === 'playing').length,
        players: Object.values(state.players).filter((p) => p.active).length,
      }))
  }

  /** A page of finished sessions, newest first, as `listEndedSessions` returns it. */
  private endedPage(before: string | null): EndedSessionsResponse {
    const ended = [...this.sessions.values()]
      .filter((s) => s.state.status !== 'active' && (!before || (s.endedAt ?? '') < before))
      .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))
    const page = ended.slice(0, sessionHistory.pageSize)
    return { sessions: page.map((s) => this.endedView(s)), nextBefore: ended.length > page.length ? (page.at(-1)!.endedAt ?? null) : null }
  }

  private latestEnded(): EndedSessionView | null {
    const ended = [...this.sessions.values()].filter((s) => s.state.status !== 'active').sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))
    return ended[0] ? this.endedView(ended[0]) : null
  }

  private endedView({ state, createdAt, endedAt }: Stored): EndedSessionView {
    return {
      id: state.id,
      title: state.title,
      clubId: state.clubId,
      coverUrl: null,
      sportId: state.settings.sportId,
      startedAt: createdAt,
      endedAt: endedAt ?? createdAt,
      matchesFinished: finished(state).length,
      players: Object.keys(state.players).length,
    }
  }

  /** As the leaderboard route builds it, club badges included when a club runs the session. */
  private leaderboard({ state, clubId }: Stored): LeaderboardView {
    const players = Object.values(state.players)
    const matches = finished(state)
    const names = new Map(players.map((p) => [p.id, p.name]))
    const clubBadges = clubId ? this.badgesFor(clubId) : []
    const career = clubId ? careerTotals(this.history(clubId)) : new Map()
    const entries = awardClubBadges(computeLeaderboard(players, matches), clubBadges, career)
    return {
      sessionId: state.id,
      spotlight: computeSpotlight(entries, matches),
      entries,
      recentMatches: matches.slice(0, limits.recentMatches).map((m) => toMatchResult(m, names)),
      clubBadges,
    }
  }

  /** The newest session's id, for tests that just set one up. */
  latestId(): string {
    const last = [...this.sessions.keys()].at(-1)
    if (!last) throw new Error('No fake session yet')
    return last
  }
}

/** Finished matches, newest first, as `loadResults` returns them. */
const finished = (state: SessionState) =>
  Object.values(state.matches)
    .filter((m) => m.finishedAt !== null)
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))

const ok = (body: unknown): FakeResponse => ({ status: 200, body })

/** The API's `body()` check: the same schema, the same field-by-field message. */
export function parse<T>(schema: ZodType<T>, raw: string | null): T {
  let json: unknown
  try {
    json = JSON.parse(raw ?? '')
  } catch {
    throw invalid('The request body was not valid JSON.')
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.') || 'body', i.message]))
    const first = parsed.error.issues[0]
    const where = first?.path.length ? `${first.path.join('.')}: ` : ''
    throw invalid(`Invalid request. ${where}${first?.message ?? 'Unexpected shape.'}`, fields)
  }
  return parsed.data
}
