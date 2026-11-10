import type { TournamentSetupInput } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import type { SessionState } from '@/interfaces/SessionState'
import { addPlayer, assignPlayer, fairQueue, finishMatch, removePlayer, startMatch } from '@/utils/session/engine'
import { applySetup } from '@/utils/session/setup'
import { readySession, setupInput, testContext } from '@test/session'
import { toSessionView } from '@/utils/session/view'
import { cancelTournament, createTournament, setCourtTournament, startTournamentMatch } from '@/utils/tournament/setup'

const win = [
  { a: 21, b: 10 },
  { a: 21, b: 12 },
]

function setup(state: SessionState, o: Partial<TournamentSetupInput> = {}): TournamentSetupInput {
  return {
    courtId: state.courts[0]!.id,
    name: 'Club cup',
    format: 'single-elimination',
    teamMode: 'fixed',
    teamBuild: 'balanced',
    playerIds: Object.keys(state.players),
    teams: [],
    seeding: 'tier',
    pools: { count: 2, advance: 1 },
    rounds: 3,
    ...o,
  }
}

function withTournament(o: Partial<TournamentSetupInput> = {}) {
  const ctx = testContext()
  const state = readySession(setupInput(), ctx)
  return { ctx, state: createTournament(state, setup(state, o), ctx) }
}

describe('createTournament', () => {
  it('forms teams, switches the court and holds its players out of open play', () => {
    const { state } = withTournament()
    expect(state.tournament!.entrants).toHaveLength(4)
    expect(state.courts[0]!.tournament).toBe(true)
    expect(fairQueue(state)).toHaveLength(0)
    const view = toSessionView(state)
    expect(view.tournament!.upNext).toHaveLength(2)
    expect(view.courts[0]!.tournamentMatch?.label).toBe('Semifinal 1')
  })

  it('names what is wrong with the entrants', () => {
    const ctx = testContext()
    const state = readySession(setupInput(), ctx)
    const seven = Object.keys(state.players).slice(0, 7)
    expect(() => createTournament(state, setup(state, { playerIds: seven }), ctx)).toThrow("7 players don't split into teams of 2")
    expect(() => createTournament(state, setup(state, { teamMode: 'rotating' }), ctx)).toThrow('round robin only')
    expect(() => createTournament(state, setup(state, { format: 'double-elimination', playerIds: seven.slice(0, 4) }), ctx)).toThrow('at least 3 teams')
  })

  it('takes hand-picked teams as given', () => {
    const ctx = testContext()
    const state = readySession(setupInput(), ctx)
    const ids = Object.keys(state.players)
    const teams = [ids.slice(0, 2), ids.slice(2, 4), ids.slice(4, 6), ids.slice(6, 8)]
    const next = createTournament(state, setup(state, { teamBuild: 'manual', teams }), ctx)
    expect(next.tournament!.entrants.map((e) => e.playerIds).sort()).toEqual(teams.sort())
    expect(() => createTournament(state, setup(state, { teamBuild: 'manual', teams: teams.slice(1) }), ctx)).toThrow('Make 4 teams of 2')
  })

  it('starts straight away with auto-fill on, whatever the queueing', () => {
    const ctx = testContext()
    // Manual queueing keeps open-play courts empty; tournament courts still fill themselves.
    const state = readySession(setupInput({ rules: { queueing: 'manual', autoFill: true, timeLimitMinutes: null, lateJoiners: 'fair' } }), ctx)
    const next = createTournament(state, setup(state), ctx)
    expect(next.courts[0]!.status).toBe('playing')
    expect(next.courts[1]!.status).toBe('open')
  })
})

describe('playing the bracket', () => {
  it('plays the previewed match, needs a score, and moves winners on', () => {
    const { ctx, state } = withTournament()
    const court = state.courts[0]!.id
    const playing = startMatch(state, court, ctx)
    expect(playing.tournament!.matches.find((m) => m.id === 'K1-0')!.sessionMatchId).not.toBeNull()
    expect(() => finishMatch(playing, court, [], ctx)).toThrow('need a score')
    const done = finishMatch(playing, court, win, ctx)
    const final = done.tournament!.matches.find((m) => m.id === 'K2-0')!
    expect(final.slots[0]!.entrantId).not.toBeNull()
  })

  it('starts a chosen match on the free tournament court', () => {
    const { ctx, state } = withTournament()
    const next = startTournamentMatch(state, 'K1-1', ctx)
    expect(next.tournament!.matches.find((m) => m.id === 'K1-1')!.courtLabel).toBe('Court 1')
    expect(() => startTournamentMatch(next, 'K1-0', ctx)).toThrow('Every tournament court has a match on')
  })

  it('keeps tournament players off open-play courts and the roster', () => {
    const { ctx, state } = withTournament()
    const anyone = Object.keys(state.players)[0]!
    expect(() => assignPlayer(state, state.courts[1]!.id, anyone, 0)).toThrow('in the tournament')
    expect(() => assignPlayer(state, state.courts[0]!.id, anyone, 0)).toThrow('plays tournament matches')
    expect(() => removePlayer(state, anyone)).toThrow('still in the tournament')
    expect(() => applySetup(state, { ...setupInput(), courts: state.courts.map((c) => ({ id: c.id, label: c.label })), members: [] }, ctx)).toThrow(
      'still in the tournament',
    )
    // Newcomers still play open play.
    const late = addPlayer(state, { name: 'Ivy', tierId: 'beginner' }, ctx)
    expect(fairQueue(late).map((p) => p.name)).toEqual(['Ivy'])
  })

  it('lets knocked-out players back into open play', () => {
    const { ctx, state } = withTournament()
    const court = state.courts[0]!.id
    const done = finishMatch(startMatch(state, court, ctx), court, win, ctx)
    expect(fairQueue(done)).toHaveLength(2)
  })
})

describe('courts and cancelling', () => {
  it('switches more courts in and out, but not mid-match', () => {
    const { ctx, state } = withTournament()
    const second = setCourtTournament(state, state.courts[1]!.id, true, ctx)
    expect(toSessionView(second).courts[1]!.tournamentMatch?.label).toBe('Semifinal 2')
    const playing = startMatch(second, second.courts[1]!.id, ctx)
    expect(() => setCourtTournament(playing, playing.courts[1]!.id, false, ctx)).toThrow('has a match on')
  })

  it('cancels once nothing is on court, returning everyone to open play', () => {
    const { ctx, state } = withTournament()
    const court = state.courts[0]!.id
    const playing = startMatch(state, court, ctx)
    expect(() => cancelTournament(playing, ctx)).toThrow('Finish it first')
    const cancelled = cancelTournament(finishMatch(playing, court, win, ctx), ctx)
    expect(cancelled.tournament).toBeNull()
    expect(cancelled.courts.every((c) => !c.tournament)).toBe(true)
    expect(fairQueue(cancelled)).toHaveLength(8)
  })
})
