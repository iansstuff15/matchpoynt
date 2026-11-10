import type { TournamentSetupInput } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import type { SessionState } from '@/interfaces/SessionState'
import { addPlayer, fairQueue } from '@/utils/session/engine'
import { readySession, setupInput, testContext } from '@test/session'
import { toSessionView } from '@/utils/session/view'
import { competitorsBlockedReason, createTournament, setTournamentCompetitors, startTournamentMatch } from '@/utils/tournament/setup'

const names = (s: SessionState, ids: Iterable<string>) => [...ids].map((id) => s.players[id]!.name).sort()

/** A ready doubles session (8 checked in, auto-fill off) with a round robin among the first `n` players by name. */
function withTournament(n: number, o: Partial<TournamentSetupInput> = {}) {
  const ctx = testContext()
  const state = readySession(setupInput({ rules: { queueing: 'automatic', autoFill: false, timeLimitMinutes: null, lateJoiners: 'fair' } }), ctx)
  const ids = Object.values(state.players)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => p.id)
  const input: TournamentSetupInput = {
    courtId: state.courts[0]!.id,
    name: 'Club cup',
    format: 'round-robin',
    teamMode: 'fixed',
    teamBuild: 'balanced',
    playerIds: ids.slice(0, n),
    teams: [],
    seeding: 'tier',
    pools: { count: 2, advance: 1 },
    rounds: 3,
    ...o,
  }
  return { ctx, ids, state: createTournament(state, input, ctx) }
}

describe('setting tournament competitors from the board', () => {
  it('adding a pair redraws with the same settings, and they leave open play', () => {
    const { ctx, ids, state } = withTournament(6)
    const s = setTournamentCompetitors(state, ids.slice(0, 8), ctx)
    expect(names(s, s.tournament!.playerIds)).toEqual(['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal'])
    expect(s.tournament!.entrants).toHaveLength(4)
    expect(s.tournament).toMatchObject({ name: 'Club cup', format: 'round-robin', seeding: 'tier' })
    expect(fairQueue(s)).toEqual([])
    expect(toSessionView(s).tournamentCompetitors).toHaveLength(8)
  })

  it('taking a pair out puts them back in open play', () => {
    const { ctx, ids, state } = withTournament(8)
    const s = setTournamentCompetitors(state, ids.slice(0, 6), ctx)
    expect(s.tournament!.entrants).toHaveLength(3)
    expect(fairQueue(s).map((p) => p.name).sort()).toEqual(['Gus', 'Hal'])
  })

  it('an odd number of players for doubles is refused with what to do', () => {
    const { ctx, ids, state } = withTournament(6)
    expect(() => setTournamentCompetitors(state, ids.slice(0, 7), ctx)).toThrow("7 players don't split into teams of 2. Add 1 or leave out 1.")
  })

  it('refuses once a tournament match has been played, and says why', () => {
    const { ctx, ids, state } = withTournament(6)
    const due = toSessionView(state).tournament!.upNext[0]!
    const started = startTournamentMatch(state, due.id, ctx)
    expect(competitorsBlockedReason(started)).toMatch(/has started/)
    expect(() => setTournamentCompetitors(started, ids, ctx)).toThrow(/has started/)
    expect(toSessionView(started).competitorsBlockedReason).toMatch(/has started/)
  })

  it('refuses players who are not checked in', () => {
    const { ctx, ids, state } = withTournament(6)
    const late = addPlayer(state, { name: 'Late', tierId: 'beginner', checkedIn: false }, ctx)
    const lateId = Object.values(late.players).find((p) => p.name === 'Late')!.id
    expect(() => setTournamentCompetitors(late, [...ids.slice(0, 7), lateId], ctx)).toThrow("Late hasn't checked in yet. Check them in first.")
  })

  it('refuses when the teams were picked by hand', () => {
    const base = withTournament(6).ids
    const pairs = [
      [base[0]!, base[1]!],
      [base[2]!, base[3]!],
      [base[4]!, base[5]!],
    ]
    const { ctx, state } = withTournament(6, { teamBuild: 'manual', teams: pairs })
    expect(competitorsBlockedReason(state)).toMatch(/picked by hand/)
    expect(() => setTournamentCompetitors(state, base, ctx)).toThrow(/picked by hand/)
  })

  it("doesn't apply without a running tournament", () => {
    const ctx = testContext()
    const s = readySession(setupInput(), ctx)
    expect(competitorsBlockedReason(s)).toBe('No tournament is running.')
    expect(toSessionView(s).competitorsBlockedReason).toBeNull()
    expect(toSessionView(s).tournamentCompetitors).toEqual([])
  })
})

describe('cancelling a tournament match', () => {
  it('puts it back as ready for a court, and its players stay in the tournament', async () => {
    const { cancelMatch } = await import('@/utils/session/engine')
    const { state, ctx } = withTournament(8)
    const due = toSessionView(state).tournament!.upNext[0]!
    const started = startTournamentMatch(state, due.id, ctx)
    const court = started.courts.find((c) => c.status === 'playing')!
    const cancelled = cancelMatch(started, court.id)
    const view = toSessionView(cancelled).tournament!
    expect(view.playing).toEqual([])
    expect(view.upNext.map((m) => m.id)).toContain(due.id)
    expect(fairQueue(cancelled)).toEqual([])
    // Nothing was played, so the draw can change again.
    expect(competitorsBlockedReason(cancelled)).toBeNull()
  })
})
