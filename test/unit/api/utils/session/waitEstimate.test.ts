import { describe, expect, it } from 'vitest'
import { finishMatch, startMatch } from '@/utils/session/engine'
import { estimatedStart, typicalMatchMs } from '@/utils/session/waitEstimate'
import { readySession, setupInput, testContext } from '@test/session'

const twelve = ['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kai', 'Lu'].map((name, i) => ({ id: `m-${i}`, name, tierId: 'beginner' }))
const twoCourts = setupInput({
  members: twelve,
  courts: [
    { id: 'c1', label: 'Court 1' },
    { id: 'c2', label: 'Court 2' },
  ],
})
const min = 60_000

describe('typicalMatchMs', () => {
  it("uses the session's finished matches, else its time limit, else the default", () => {
    const ctx = testContext()
    const ready = readySession(twoCourts, ctx)
    expect(typicalMatchMs(ready, [])).toBe(12 * min)
    const limited = { ...ready, settings: { ...ready.settings, rules: { ...ready.settings.rules, timeLimitMinutes: 15 } } }
    expect(typicalMatchMs(limited, [])).toBe(15 * min)

    const c1 = ready.courts[0]!.id
    let s = startMatch(ready, c1, ctx)
    ctx.tick(10 * min)
    s = finishMatch(
      s,
      c1,
      [
        { a: 21, b: 10 },
        { a: 21, b: 12 },
      ],
      ctx,
    )
    const finished = Object.values(s.matches).filter((m) => m.finishedAt !== null)
    expect(typicalMatchMs(s, finished)).toBe(10 * min)
  })
})

describe('estimatedStart', () => {
  it('starts matches on free courts now, then as courts free up after the typical length', () => {
    const ctx = testContext()
    const ready = readySession(twoCourts, ctx)
    const now = ctx.now
    // Two open courts: the first two matches can start at once, the third once one finishes.
    expect(estimatedStart(ready, [], 0, now)).toBe(now)
    expect(estimatedStart(ready, [], 1, now)).toBe(now)
    expect(estimatedStart(ready, [], 2, now)).toBe(now + 12 * min)

    // Court 1 has been playing 5 minutes: it frees in 7; court 2 is open now.
    const [c1, c2] = ready.courts.map((c) => c.id)
    let s = startMatch(ready, c1!, ctx)
    ctx.tick(5 * min)
    expect(estimatedStart(s, [], 0, ctx.now)).toBe(ctx.now)
    expect(estimatedStart(s, [], 1, ctx.now)).toBe(ctx.now + 7 * min)
    // A match past its typical length is due any moment, not in the past.
    ctx.tick(20 * min)
    s = startMatch(s, c2!, ctx)
    expect(estimatedStart(s, [], 0, ctx.now)).toBe(ctx.now)
  })

  it("can't say without an open-play court", () => {
    const ready = readySession(twoCourts)
    const allTournament = { ...ready, courts: ready.courts.map((c) => ({ ...c, tournament: true })) }
    expect(estimatedStart(allTournament, [], 0, 0)).toBeNull()
  })
})
