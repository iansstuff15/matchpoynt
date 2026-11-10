import { describe, expect, it } from 'vitest'
import type { SessionState } from '@/interfaces/SessionState'
import { addPlayer, endBlockedReason, fairQueue, finishMatch, openMatchFor, removePlayer, startMatch } from '@/utils/session/engine'
import { applySetup, createSession } from '@/utils/session/setup'
import { readySession, setupInput, testContext } from '@test/session'
import { toSessionView } from '@/utils/session/view'

const names = (state: SessionState, ids: string[]) => ids.map((id) => state.players[id]!.name).join('')
const court = (state: SessionState, i: number) => state.courts[i]!.id

describe('createSession', () => {
  it('replaces every client id with a server id', () => {
    const state = createSession('owner', setupInput(), testContext())
    expect(state.courts.map((c) => c.id).some((id) => id.startsWith('client'))).toBe(false)
    expect(Object.keys(state.players).some((id) => id.startsWith('client'))).toBe(false)
  })

  it('rejects an invalid setup with errors per step', () => {
    expect(() => readySession(setupInput({ courts: [] }), testContext())).toThrow('Add at least one court.')
    try {
      readySession(setupInput({ courts: [{ id: '1', label: 'A' }, { id: '2', label: 'a' }] }), testContext())
    } catch (e) {
      expect((e as { fields: object }).fields).toMatchObject({ courts: 'Court names must be different.' })
    }
  })
})

describe('queue and matches', () => {
  it('starts matches in fair order and sends players to the back after', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    s = startMatch(s, court(s, 0), ctx)
    const match = openMatchFor(s, court(s, 0))!
    expect(names(s, match.sides[0]) + '|' + names(s, match.sides[1])).toBe('AnaCy|BenDee')

    ctx.tick()
    s = finishMatch(s, court(s, 0), [{ a: 21, b: 15 }, { a: 21, b: 18 }], ctx)
    expect(fairQueue(s).map((p) => p.name).join(',')).toBe('Eli,Fay,Gus,Hal,Ana,Ben,Cy,Dee')
    expect(s.matches[match.id]!.winner).toBe('a')
    expect(s.players[match.sides[0][0]!]!.gamesPlayed).toBe(1)
  })

  it('refuses to start without enough players or on a busy court', () => {
    const ctx = testContext()
    let s = readySession(setupInput({ members: setupInput().members.slice(0, 3) }), ctx)
    expect(() => startMatch(s, court(s, 0), ctx)).toThrow('Court 1 needs 1 more checked-in player waiting.')
    s = addPlayer(s, { name: 'Ivy', tierId: 'beginner' }, ctx)
    s = startMatch(s, court(s, 0), ctx)
    expect(() => startMatch(s, court(s, 0), ctx)).toThrow('already has a match')
  })

  it('auto-fills every open court it can', () => {
    const s = readySession(setupInput({ rules: { queueing: 'automatic', autoFill: true, timeLimitMinutes: null, lateJoiners: 'fair' } }), testContext())
    expect(s.courts.filter((c) => c.status === 'playing')).toHaveLength(2)
  })

  it('finishes without a result when no games are given', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    s = startMatch(s, court(s, 0), ctx)
    s = finishMatch(s, court(s, 0), [], ctx)
    expect(Object.values(s.matches)[0]!.winner).toBeNull()
  })

  it('keeps players on court and removes waiting ones', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    s = startMatch(s, court(s, 0), ctx)
    const onCourt = openMatchFor(s, court(s, 0))!.sides[0][0]!
    expect(() => removePlayer(s, onCourt)).toThrow('is on court')
    const waiting = fairQueue(s)[0]!.id
    expect(removePlayer(s, waiting).players[waiting]!.active).toBe(false)
  })
})

describe('late joiners', () => {
  const played = () => {
    const ctx = testContext()
    let s = readySession(setupInput({ members: setupInput().members.slice(0, 4) }), ctx)
    s = startMatch(s, court(s, 0), ctx)
    s = finishMatch(s, court(s, 0), [], ctx)
    return { s, ctx }
  }

  it('fair: joins at the lowest rotation, behind those already waiting', () => {
    const { s, ctx } = played()
    const next = addPlayer(s, { name: 'Late', tierId: 'beginner' }, ctx)
    const late = Object.values(next.players).find((p) => p.name === 'Late')!
    expect(late.rotation).toBe(1)
    expect(late.gamesPlayed).toBe(0)
  })

  it('priority: goes to the front', () => {
    const { s, ctx } = played()
    const withRule = { ...s, settings: { ...s.settings, rules: { ...s.settings.rules, lateJoiners: 'priority' as const } } }
    const next = addPlayer(withRule, { name: 'Late', tierId: 'beginner' }, ctx)
    expect(fairQueue(next)[0]!.name).toBe('Late')
  })
})

describe('applySetup', () => {
  it('keeps the playing court and on-court players, renames, removes and adds', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    s = startMatch(s, court(s, 1), ctx)
    const view = toSessionView(s)
    const playing = view.courts[1]!
    const onCourt = playing.sides[0][0]!.id

    s = applySetup(
      s,
      setupInput({
        courts: [{ id: view.courts[0]!.id, label: 'Centre' }, { id: 'brand-new', label: 'Court 9' }],
        members: [...view.players.filter((p) => p.id !== onCourt && p.name !== 'Hal'), { id: 'x', name: 'Ivy', tierId: 'open' }],
      }),
      ctx,
    )

    expect(s.courts.map((c) => c.label)).toEqual(['Centre', 'Court 9', playing.label])
    expect(s.courts.some((c) => c.id === 'brand-new')).toBe(false)
    expect(s.players[onCourt]!.active).toBe(true)
    expect(Object.values(s.players).find((p) => p.name === 'Hal')!.active).toBe(false)
    expect(Object.values(s.players).some((p) => p.name === 'Ivy' && p.id !== 'x')).toBe(true)
  })

  it('does not allow switching sport', () => {
    const ctx = testContext()
    const s = readySession(setupInput(), ctx)
    expect(() => applySetup(s, setupInput({ sportId: 'tennis', scoring: { formatId: 'fast4', matchFormat: 'doubles' } }), ctx)).toThrow(
      'one sport',
    )
  })
})

describe('endBlockedReason', () => {
  it('lets a session end only when no match is on court', () => {
    const ctx = testContext()
    const state = readySession(setupInput(), ctx)
    expect(endBlockedReason(state)).toBeNull()
    const playing = startMatch(startMatch(state, state.courts[0]!.id, ctx), state.courts[1]!.id, ctx)
    expect(endBlockedReason(playing)).toBe('Court 1 and Court 2 still have matches on. Finish them before ending the session.')
    expect(endBlockedReason(finishMatch(playing, state.courts[0]!.id, [], ctx))).toContain('Court 2 still has a match on')
  })
})
