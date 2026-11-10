import { describe, expect, it } from 'vitest'
import type { SessionState } from '@/interfaces/SessionState'
import { assignPlayer, awaitingCheckIn, cancelMatch, checkInPlayer, removeCourt, removeCourtBlockedReason, fairQueue, finishMatch, openMatchFor, restartMatch, restartSession, startMatch } from '@/utils/session/engine'
import { createSession } from '@/utils/session/setup'
import { toSessionView } from '@/utils/session/view'
import { setupInput, testContext } from '@test/session'
import { ApiError } from '@/utils/http/errors'

const autoFillOff = { queueing: 'automatic' as const, autoFill: false, timeLimitMinutes: null, lateJoiners: 'fair' as const }

/** A session with everyone checked in, the first court playing and one result on the second. */
function running(ctx: ReturnType<typeof testContext>): SessionState {
  let s = createSession('owner', setupInput({ rules: autoFillOff }), ctx)
  for (const p of Object.values(s.players)) {
    ctx.tick()
    s = checkInPlayer(s, p.id, ctx)
  }
  ctx.tick()
  s = startMatch(s, s.courts[1]!.id, ctx)
  ctx.tick()
  s = finishMatch(s, s.courts[1]!.id, [{ a: 21, b: 10 }, { a: 21, b: 12 }], ctx)
  ctx.tick()
  return startMatch(s, s.courts[0]!.id, ctx)
}

describe('restartMatch', () => {
  it('replays the match: same players and sides, clock back to now, nothing recorded', () => {
    const ctx = testContext()
    const s = running(ctx)
    const before = openMatchFor(s, s.courts[0]!.id)!
    ctx.tick(60_000)
    const after = restartMatch(s, s.courts[0]!.id, ctx)
    const replayed = openMatchFor(after, after.courts[0]!.id)!
    expect(replayed.id).toBe(before.id)
    expect(replayed.sides).toEqual(before.sides)
    expect(replayed.startedAt).toBe(ctx.now)
    expect(replayed.startedAt).toBeGreaterThan(before.startedAt)
    expect(replayed.finishedAt).toBeNull()
    expect(after.courts[0]!.status).toBe('playing')
    // Nobody's record changes.
    expect(Object.values(after.players).map((p) => p.gamesPlayed)).toEqual(Object.values(s.players).map((p) => p.gamesPlayed))
  })

  it("says why when the court has no match on", () => {
    const ctx = testContext()
    const s = running(ctx)
    expect(() => restartMatch(s, s.courts[2]!.id, ctx)).toThrow('Court 3 has no match in progress to restart.')
    expect(() => restartMatch(s, 'nope', ctx)).toThrow(ApiError)
  })
})

describe('restartSession', () => {
  it('drops every match and opens every court, keeping courts, settings and players', () => {
    const ctx = testContext()
    const s = running(ctx)
    ctx.tick()
    const fresh = restartSession(s, ctx)
    expect(fresh.matches).toEqual({})
    expect(fresh.courts.map((c) => [c.label, c.status])).toEqual(s.courts.map((c) => [c.label, 'open']))
    expect(fresh.settings).toEqual(s.settings)
    expect(Object.keys(fresh.players).sort()).toEqual(Object.keys(s.players).sort())
    expect(Object.values(fresh.players).every((p) => p.status === 'waiting' && p.gamesPlayed === 0 && p.rotation === 0)).toBe(true)
  })

  it('keeps check-ins, and queues everyone in the order they arrived', () => {
    const ctx = testContext()
    const s = running(ctx)
    const arrival = Object.values(s.players)
      .sort((a, b) => a.checkedInAt! - b.checkedInAt!)
      .map((p) => p.name)
    ctx.tick()
    const fresh = restartSession(s, ctx)
    expect(fairQueue(fresh).map((p) => p.name)).toEqual(arrival)
    expect(awaitingCheckIn(fresh)).toEqual([])
  })

  it('with auto-fill on, starts filling courts again straight away', () => {
    const ctx = testContext()
    const s = running(ctx)
    const withAutoFill = { ...s, settings: { ...s.settings, rules: { ...s.settings.rules, autoFill: true } } }
    ctx.tick()
    const fresh = restartSession(withAutoFill, ctx)
    expect(fresh.courts.filter((c) => c.status === 'playing').length).toBeGreaterThan(0)
    expect(Object.values(fresh.matches).every((m) => m.finishedAt === null)).toBe(true)
  })
})

describe('cancelMatch', () => {
  it('drops the match with no result: players back where they were in the queue, court open', () => {
    const ctx = testContext()
    let s = createSession('owner', setupInput({ rules: autoFillOff }), ctx)
    for (const p of Object.values(s.players)) {
      ctx.tick()
      s = checkInPlayer(s, p.id, ctx)
    }
    const queueBefore = fairQueue(s).map((p) => p.name)
    ctx.tick()
    s = startMatch(s, s.courts[0]!.id, ctx)
    const cancelled = cancelMatch(s, s.courts[0]!.id)
    expect(cancelled.courts[0]!.status).toBe('open')
    expect(openMatchFor(cancelled, cancelled.courts[0]!.id)).toBeUndefined()
    expect(Object.keys(cancelled.matches)).toHaveLength(0)
    expect(fairQueue(cancelled).map((p) => p.name)).toEqual(queueBefore)
    expect(Object.values(cancelled.players).every((p) => p.gamesPlayed === 0)).toBe(true)
  })

  it("says why when there's nothing to cancel", () => {
    const ctx = testContext()
    const s = running(ctx)
    expect(() => cancelMatch(s, s.courts[2]!.id)).toThrow('Court 3 has no match in progress to cancel.')
  })

  it('keeps finished results', () => {
    const ctx = testContext()
    const s = running(ctx)
    const finished = Object.values(s.matches).filter((m) => m.finishedAt !== null)
    const cancelled = cancelMatch(s, s.courts[0]!.id)
    expect(Object.values(cancelled.matches)).toEqual(finished)
  })
})

describe('removeCourt', () => {
  it('removes an open court; the others keep their order', () => {
    const ctx = testContext()
    const s = running(ctx)
    const after = removeCourt(s, s.courts[2]!.id)
    expect(after.courts.map((c) => [c.label, c.position])).toEqual([
      ['Court 1', 0],
      ['Court 2', 1],
      ['Court 4', 2],
    ])
  })

  it('players placed on it go back to the queue', () => {
    const ctx = testContext()
    let s = running(ctx)
    const placed = fairQueue(s)[0]!
    s = assignPlayer(s, s.courts[3]!.id, placed.id, 0)
    expect(fairQueue(s).map((p) => p.id)).not.toContain(placed.id)
    const after = removeCourt(s, s.courts[3]!.id)
    expect(fairQueue(after).map((p) => p.id)).toContain(placed.id)
  })

  it('refuses a court with a match on, and the last court, saying why', () => {
    const ctx = testContext()
    const s = running(ctx)
    expect(() => removeCourt(s, s.courts[0]!.id)).toThrow('Court 1 has a match on. Finish or cancel it first.')
    const one = { ...s, courts: [s.courts[2]!] }
    expect(removeCourtBlockedReason(one, one.courts[0]!)).toBe('A session needs at least one court.')
  })

  it('the board says which courts can go, and why not', () => {
    const ctx = testContext()
    const s = running(ctx)
    const courts = toSessionView(s).courts
    expect(courts[0]!.removeBlockedReason).toMatch(/has a match on/)
    expect(courts[2]!.removeBlockedReason).toBeNull()
  })
})

describe('wait times', () => {
  it('a queued player waits from when they checked in, then from when their match finished', () => {
    const ctx = testContext()
    let s = createSession('owner', setupInput({ rules: autoFillOff }), ctx)
    const ana = Object.values(s.players).find((p) => p.name === 'Ana')!
    expect(toSessionView(s).awaitingCheckIn.find((p) => p.id === ana.id)!.waitingSince).toBeNull()
    for (const p of Object.values(s.players)) {
      ctx.tick()
      s = checkInPlayer(s, p.id, ctx)
    }
    const checkedInAt = s.players[ana.id]!.checkedInAt!
    expect(toSessionView(s).queue.find((p) => p.id === ana.id)!.waitingSince).toBe(new Date(checkedInAt).toISOString())

    ctx.tick()
    s = startMatch(s, s.courts[0]!.id, ctx)
    const onCourt = toSessionView(s).players.find((p) => p.onCourt)!
    expect(onCourt.waitingSince).toBeNull()

    ctx.tick(60_000)
    s = finishMatch(s, s.courts[0]!.id, [{ a: 21, b: 10 }, { a: 21, b: 12 }], ctx)
    expect(toSessionView(s).queue.find((p) => p.id === onCourt.id)!.waitingSince).toBe(new Date(ctx.now).toISOString())
  })
})
