import { describe, expect, it } from 'vitest'
import type { SessionState } from '@/interfaces/SessionState'
import { addCourt, addCourtBlockedReason, openMatchFor, startMatch, upcomingMatches } from '@/utils/session/engine'
import { readySession, setupInput, testContext } from '@test/session'
import { toSessionView } from '@/utils/session/view'

const names = (s: SessionState, ids: string[]) => ids.map((id) => s.players[id]!.name)
const manual = { queueing: 'manual' as const, autoFill: false, timeLimitMinutes: null, lateJoiners: 'fair' as const }

describe('upcomingMatches', () => {
  it('groups the queue into the matches it will make, with sides', () => {
    const s = readySession(setupInput({ members: [...setupInput().members, { id: 'x', name: 'Ivy', tierId: 'beginner' }] }))
    const next = upcomingMatches(s)!
    expect(next.matches.map(([a, b]) => [names(s, a), names(s, b)])).toEqual([
      [['Ana', 'Cy'], ['Ben', 'Dee']],
      [['Eli', 'Gus'], ['Fay', 'Hal']],
    ])
    expect(names(s, next.waiting)).toEqual(['Ivy'])
  })

  it('previews exactly what starting an empty court does', () => {
    for (const matchmaking of ['rotation', 'balanced', 'skill-grouped'] as const) {
      const ctx = testContext()
      const members = setupInput().members.map((m, i) => ({ ...m, tierId: ['beginner', 'intermediate', 'advanced', 'open'][i % 4]! }))
      const s = readySession(setupInput({ matchmaking, members }), ctx)
      const preview = upcomingMatches(s)!.matches[0]
      const started = startMatch(s, s.courts[0]!.id, ctx)
      expect(openMatchFor(started, s.courts[0]!.id)!.sides).toEqual(preview)
    }
  })

  it('is off with manual queueing', () => {
    const s = readySession(setupInput({ rules: manual }))
    expect(upcomingMatches(s)).toBeNull()
    expect(toSessionView(s).upNext).toBeNull()
  })
})

describe('addCourt', () => {
  it('adds an open court with the next free name', () => {
    const ctx = testContext()
    let s = readySession(setupInput({ courts: [{ id: 'a', label: 'Court 1' }, { id: 'b', label: 'Court 3' }] }), ctx)
    s = addCourt(s, ctx)
    expect(s.courts.map((c) => c.label)).toEqual(['Court 1', 'Court 3', 'Court 4'])
    expect(s.courts[2]).toMatchObject({ status: 'open', position: 2, lineup: [[], []] })
  })

  it('auto-fills the new court when it can', () => {
    const ctx = testContext()
    const rules = { queueing: 'automatic' as const, autoFill: true, timeLimitMinutes: null, lateJoiners: 'fair' as const }
    let s = readySession(setupInput({ rules, courts: [{ id: 'a', label: 'Court 1' }] }), ctx)
    expect(s.courts[0]!.status).toBe('playing')
    s = addCourt(s, ctx)
    expect(s.courts[1]!.status).toBe('playing')
  })

  it('stops at the court limit and says why', () => {
    const ctx = testContext()
    let s = readySession(setupInput(), ctx)
    while (s.courts.length < 16) s = addCourt(s, ctx)
    expect(addCourtBlockedReason(s)).toBe('A session can have up to 16 courts.')
    expect(() => addCourt(s, ctx)).toThrow('up to 16 courts')
    expect(toSessionView(s).canAddCourt).toBe(false)
  })
})
