import { describe, expect, it } from 'vitest'
import type { SessionState } from '@/interfaces/SessionState'
import { assignPlayer, breakBlockedReason, fairQueue, onBreak, openMatchFor, setPlayerBreak, startMatch } from '@/utils/session/engine'
import { readySession, setupInput, testContext } from '@test/session'
import { toSessionView } from '@/utils/session/view'

const idOf = (state: SessionState, name: string) => Object.values(state.players).find((p) => p.name === name)!.id
const queue = (state: SessionState) => fairQueue(state).map((p) => p.name).join(',')

describe('taking a break', () => {
  it('takes a player out of the queue and off their court, and puts them back in from now', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    const ana = idOf(s, 'Ana')
    s = assignPlayer(s, s.courts[0]!.id, ana, 0)
    ctx.tick()
    s = setPlayerBreak(s, ana, true, ctx)
    expect(queue(s)).toBe('Ben,Cy,Dee,Eli,Fay,Gus,Hal')
    expect(s.courts[0]!.lineup[0]).toEqual([])
    expect(onBreak(s).map((p) => p.name)).toEqual(['Ana'])

    // A match starts without her.
    s = startMatch(s, s.courts[0]!.id, ctx)
    expect(openMatchFor(s, s.courts[0]!.id)!.sides.flat()).not.toContain(ana)

    ctx.tick(60_000)
    s = setPlayerBreak(s, ana, false, ctx)
    expect(onBreak(s)).toEqual([])
    expect(s.players[ana]!.queuedAt).toBe(ctx.now)
    // Same rotation (no games yet), so she's called before the four who just played, after those who waited longer.
    expect(queue(s)).toBe('Fay,Gus,Hal,Ana')
  })

  it('refuses players on court, not checked in, already on a break or not on one', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    s = startMatch(s, s.courts[0]!.id, ctx)
    const playing = openMatchFor(s, s.courts[0]!.id)!.sides[0][0]!
    expect(breakBlockedReason(s, playing, true)).toContain('is on court')
    const eli = idOf(s, 'Eli')
    expect(breakBlockedReason(s, eli, false)).toBe("Eli isn't on a break.")
    s = setPlayerBreak(s, eli, true, ctx)
    expect(breakBlockedReason(s, eli, true)).toBe('Eli is already on a break.')
    expect(() => assignPlayer(s, s.courts[1]!.id, eli, 0)).toThrow('Eli is on a break. End their break first.')
    expect(() => setPlayerBreak(s, 'nobody', true, ctx)).toThrow('That player is not in this session.')
  })

  it('auto-fill leaves players on a break out', () => {
    const ctx = testContext()
    let s = readySession(setupInput({ rules: { queueing: 'automatic', autoFill: true, timeLimitMinutes: null, lateJoiners: 'fair' }, courts: [{ id: 'c1', label: 'Court 1' }] }), ctx)
    // Eight players, one court: four on, four waiting. One waiting player breaks.
    const waiting = fairQueue(s)[0]!
    s = setPlayerBreak(s, waiting.id, true, ctx)
    expect(fairQueue(s)).toHaveLength(3)
    expect(fairQueue(s).map((p) => p.id)).not.toContain(waiting.id)
  })

  it('the board lists players on a break, without a wait clock, and leaves them out of the queue', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    s = setPlayerBreak(s, idOf(s, 'Ben'), true, ctx)
    const view = toSessionView(s)
    expect(view.onBreak.map((p) => p.name)).toEqual(['Ben'])
    expect(view.onBreak[0]!.breakSince).not.toBeNull()
    expect(view.onBreak[0]!.waitingSince).toBeNull()
    expect(view.queue.map((p) => p.name)).not.toContain('Ben')
  })
})
