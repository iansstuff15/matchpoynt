import { describe, expect, it } from 'vitest'
import type { SessionState } from '@/interfaces/SessionState'
import { assignPlayer, autoFill, fairQueue, finishMatch, openMatchFor, removePlayer, startBlockedReason, startMatch, unassignPlayer } from '@/utils/session/engine'
import { applySetup } from '@/utils/session/setup'
import { readySession, setupInput, testContext } from '@test/session'
import { toSessionView } from '@/utils/session/view'

const id = (s: SessionState, name: string) => Object.values(s.players).find((p) => p.name === name)!.id
const names = (s: SessionState, ids: string[]) => ids.map((i) => s.players[i]!.name)
const court = (s: SessionState, i = 0) => s.courts[i]!
const manual = { queueing: 'manual' as const, autoFill: false, timeLimitMinutes: null, lateJoiners: 'fair' as const }

describe('manual placement', () => {
  it('places, moves and unplaces players; placed players leave the queue', () => {
    let s = readySession(setupInput(), testContext())
    s = assignPlayer(s, court(s).id, id(s, 'Hal'), 0)
    expect(names(s, court(s).lineup[0])).toEqual(['Hal'])
    expect(fairQueue(s).some((p) => p.name === 'Hal')).toBe(false)

    s = assignPlayer(s, court(s, 1).id, id(s, 'Hal'), 1)
    expect(court(s).lineup[0]).toEqual([])
    expect(names(s, court(s, 1).lineup[1])).toEqual(['Hal'])

    s = unassignPlayer(s, id(s, 'Hal'))
    expect(court(s, 1).lineup.flat()).toEqual([])
    expect(fairQueue(s).some((p) => p.name === 'Hal')).toBe(true)
  })

  it('refuses a full side and players already on court', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    s = assignPlayer(s, court(s).id, id(s, 'Ana'), 0)
    s = assignPlayer(s, court(s).id, id(s, 'Ben'), 0)
    expect(() => assignPlayer(s, court(s).id, id(s, 'Cy'), 0)).toThrow('Side 1 of Court 1 is full (2 per side)')
    s = startMatch(s, court(s, 1).id, ctx)
    const playing = openMatchFor(s, court(s, 1).id)!.sides[0][0]!
    expect(() => assignPlayer(s, court(s).id, playing, 1)).toThrow('is on court')
    expect(() => assignPlayer(s, court(s, 1).id, id(s, 'Hal'), 1)).toThrow('has a match in progress')
  })

  it('keeps hand-placed players on their sides and fills the rest automatically', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    s = assignPlayer(s, court(s).id, id(s, 'Hal'), 1)
    s = startMatch(s, court(s).id, ctx)
    const match = openMatchFor(s, court(s).id)!
    expect(names(s, match.sides[1])).toContain('Hal')
    expect(match.sides[0]).toHaveLength(2)
    expect(match.sides[1]).toHaveLength(2)
    expect(court(s).lineup.flat()).toEqual([])
  })

  it('with manual queueing, starts only a full lineup and says how many are missing', () => {
    const ctx = testContext()
    let s = readySession(setupInput({ rules: manual }), ctx)
    expect(startBlockedReason(s, court(s))).toBe('Drag 4 more players onto Court 1. Automatic queueing is off.')
    for (const [name, side] of [['Ana', 0], ['Ben', 0], ['Cy', 1]] as const) s = assignPlayer(s, court(s).id, id(s, name), side)
    expect(() => startMatch(s, court(s).id, ctx)).toThrow('Drag 1 more player onto Court 1')
    s = assignPlayer(s, court(s).id, id(s, 'Dee'), 1)
    s = startMatch(s, court(s).id, ctx)
    expect(names(s, openMatchFor(s, court(s).id)!.sides.flat())).toEqual(['Ana', 'Ben', 'Cy', 'Dee'])
  })

  it('auto-fill skips courts being arranged and does nothing in manual mode', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    s = assignPlayer(s, court(s).id, id(s, 'Ana'), 0)
    s = { ...s, settings: { ...s.settings, rules: { ...s.settings.rules, autoFill: true } } }
    s = autoFill(s, ctx)
    expect(court(s).status).toBe('open')
    expect(court(s, 1).status).toBe('playing')

    let m = readySession(setupInput({ rules: { ...manual, autoFill: true } }), ctx)
    m = autoFill(m, ctx)
    expect(m.courts.every((c) => c.status === 'open')).toBe(true)
  })

  it('removing a placed player clears their place; finishing a match leaves other lineups intact', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    s = assignPlayer(s, court(s, 2).id, id(s, 'Hal'), 0)
    s = removePlayer(s, id(s, 'Hal'))
    expect(court(s, 2).lineup.flat()).toEqual([])
    s = assignPlayer(s, court(s, 2).id, id(s, 'Gus'), 0)
    s = startMatch(s, court(s).id, ctx)
    s = finishMatch(s, court(s).id, [], ctx)
    expect(names(s, court(s, 2).lineup[0])).toEqual(['Gus'])
  })

  it('trims lineups when the match type shrinks, and the view explains each court', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    s = assignPlayer(s, court(s).id, id(s, 'Ana'), 0)
    s = assignPlayer(s, court(s).id, id(s, 'Ben'), 0)
    const view = toSessionView(s)
    s = applySetup(
      s,
      setupInput({ scoring: { formatId: 'bwf-21', matchFormat: 'singles' }, courts: view.courts.map(({ id: cid, label }) => ({ id: cid, label })), members: view.players }),
      ctx,
    )
    expect(names(s, court(s).lineup[0])).toEqual(['Ana'])
    const after = toSessionView(s).courts[0]!
    expect(after.lineup[0].map((p) => p.name)).toEqual(['Ana'])
    expect(after.openSlots).toBe(1)
    expect(after.canStart).toBe(true)
  })
})

describe('court timers', () => {
  it('gives each playing match an end time when the session has a time limit, and the server clock', () => {
    const ctx = testContext(1_000_000)
    let s = readySession(setupInput({ rules: { queueing: 'automatic', autoFill: false, timeLimitMinutes: 15, lateJoiners: 'fair' } }), ctx)
    s = startMatch(s, court(s).id, ctx)
    const view = toSessionView(s, 1_060_000)
    expect(view.courts[0]!.startedAt).toBe(new Date(1_000_000).toISOString())
    expect(view.courts[0]!.endsAt).toBe(new Date(1_000_000 + 15 * 60_000).toISOString())
    expect(view.courts[1]!.endsAt).toBeNull()
    expect(view.serverTime).toBe(new Date(1_060_000).toISOString())
  })

  it('has no end time without a limit', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    s = startMatch(s, court(s).id, ctx)
    expect(toSessionView(s).courts[0]!.endsAt).toBeNull()
  })
})
