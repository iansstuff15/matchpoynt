import { describe, expect, it } from 'vitest'
import type { SessionState } from '@/interfaces/SessionState'
import { addPlayer, assignPlayer, awaitingCheckIn, checkInPlayer, fairQueue, finishMatch, settleCheckIns, startBlockedReason, startMatch } from '@/utils/session/engine'
import { createSession } from '@/utils/session/setup'
import { setupInput, testContext } from '@test/session'
import { toSessionView } from '@/utils/session/view'

const id = (s: SessionState, name: string) => Object.values(s.players).find((p) => p.name === name)!.id
const queueNames = (s: SessionState) => fairQueue(s).map((p) => p.name)
const autoFillOn = { queueing: 'automatic' as const, autoFill: true, timeLimitMinutes: null, lateJoiners: 'fair' as const }

/** What the QR does: the database records the time and nothing else. */
const qrCheckIn = (s: SessionState, name: string, at: number): SessionState => ({
  ...s,
  players: { ...s.players, [id(s, name)]: { ...s.players[id(s, name)]!, checkedInAt: at } },
})

const checkIn = (s: SessionState, names: string[], ctx: ReturnType<typeof testContext>) => {
  for (const name of names) {
    ctx.tick()
    s = checkInPlayer(s, id(s, name), ctx)
  }
  return s
}

describe('check-in', () => {
  it('starts the roster not checked in: nobody is queued, matched or auto-filled', () => {
    const ctx = testContext()
    const s = createSession('o', setupInput({ rules: autoFillOn }), ctx)
    expect(fairQueue(s)).toEqual([])
    expect(awaitingCheckIn(s)).toHaveLength(8)
    expect(s.courts.every((c) => c.status === 'open')).toBe(true)
    expect(startBlockedReason(s, s.courts[0]!)).toBe('Court 1 needs 4 more checked-in players waiting.')
    expect(() => startMatch(s, s.courts[0]!.id, ctx)).toThrow('needs 4 more checked-in players')
  })

  it('queues players in the order they check in', () => {
    const ctx = testContext()
    let s = createSession('o', setupInput(), ctx)
    s = checkIn(s, ['Hal', 'Cy', 'Ana'], ctx)
    expect(queueNames(s)).toEqual(['Hal', 'Cy', 'Ana'])
    expect(awaitingCheckIn(s).map((p) => p.name)).toEqual(['Ben', 'Dee', 'Eli', 'Fay', 'Gus'])
  })

  it('auto-fills a court once enough players have checked in', () => {
    const ctx = testContext()
    let s = createSession('o', setupInput({ rules: autoFillOn }), ctx)
    s = checkIn(s, ['Ana', 'Ben', 'Cy'], ctx)
    expect(s.courts.every((c) => c.status === 'open')).toBe(true)
    s = checkIn(s, ['Dee'], ctx)
    expect(s.courts[0]!.status).toBe('playing')
  })

  it('refuses to place a player who has not checked in', () => {
    const ctx = testContext()
    let s = createSession('o', setupInput(), ctx)
    expect(() => assignPlayer(s, s.courts[0]!.id, id(s, 'Ana'), 0)).toThrow("Ana hasn't checked in yet")
    s = checkIn(s, ['Ana'], ctx)
    expect(assignPlayer(s, s.courts[0]!.id, id(s, 'Ana'), 0).courts[0]!.lineup[0]).toEqual([id(s, 'Ana')])
  })

  it('checking in twice changes nothing', () => {
    const ctx = testContext()
    let s = checkIn(createSession('o', setupInput(), ctx), ['Ana'], ctx)
    ctx.tick()
    expect(checkInPlayer(s, id(s, 'Ana'), ctx)).toBe(s)
  })

  it('late arrivals added by the Queue Master are checked in', () => {
    const ctx = testContext()
    const s = addPlayer(createSession('o', setupInput(), ctx), { name: 'Ivy', tierId: 'beginner' }, ctx)
    expect(queueNames(s)).toEqual(['Ivy'])
  })

  it('a late check-in waits behind players who have not played since, under the fair rule', () => {
    const ctx = testContext()
    let s = createSession('o', setupInput(), ctx)
    s = checkIn(s, ['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay'], ctx)
    s = startMatch(s, s.courts[0]!.id, ctx)
    ctx.tick()
    s = finishMatch(s, s.courts[0]!.id, [], ctx)
    s = checkIn(s, ['Gus'], ctx)
    // Eli and Fay haven't played and Gus only just arrived, so he goes after them, before those who played.
    expect(queueNames(s)).toEqual(['Eli', 'Fay', 'Gus', 'Ana', 'Ben', 'Cy', 'Dee'])
  })

  it('settles QR check-ins in arrival order, the same way as by hand', () => {
    const ctx = testContext()
    let s = createSession('o', setupInput(), ctx)
    s = qrCheckIn(s, 'Gus', ctx.now + 5_000)
    s = qrCheckIn(s, 'Ben', ctx.now + 2_000)
    // Before settling, a QR check-in already counts: they're in the queue.
    expect(queueNames(s).sort()).toEqual(['Ben', 'Gus'])
    s = settleCheckIns(s)
    expect(queueNames(s)).toEqual(['Ben', 'Gus'])
    expect(s.players[id(s, 'Gus')]!.queuedAt).toBe(ctx.now + 5_000)
    expect(settleCheckIns(s)).toBe(s)
  })

  it('reports check-in progress and who is still to come in the view', () => {
    const ctx = testContext()
    const s = checkIn(createSession('o', setupInput(), ctx), ['Ana', 'Ben'], ctx)
    const view = toSessionView(s)
    expect(view.checkIn).toEqual({ url: null, checkedIn: 2, total: 8 })
    expect(view.queue.map((p) => p.name)).toEqual(['Ana', 'Ben'])
    expect(view.awaitingCheckIn.every((p) => !p.checkedIn)).toBe(true)
    expect(view.players.find((p) => p.name === 'Ana')!.checkedIn).toBe(true)
  })
})

describe('"already checked in" when adding players', () => {
  const members = (marked: string[]) => ['Ana', 'Ben', 'Cy', 'Dee'].map((name, i) => ({ id: `client-${i}`, name, tierId: 'beginner', checkedIn: marked.includes(name) }))

  it('setup players marked as here are checked in and queued; the rest wait to check in', () => {
    const ctx = testContext()
    const s = createSession('owner', setupInput({ members: members(['Ana', 'Cy']) }), ctx)
    expect(queueNames(s)).toEqual(['Ana', 'Cy'])
    expect(awaitingCheckIn(s).map((p) => p.name)).toEqual(['Ben', 'Dee'])
  })

  it('with auto-fill, enough players marked as here fill a court straight away', () => {
    const ctx = testContext()
    const s = createSession('owner', setupInput({ rules: autoFillOn, members: members(['Ana', 'Ben', 'Cy', 'Dee']) }), ctx)
    expect(s.courts[0]!.status).toBe('playing')
    expect(awaitingCheckIn(s)).toEqual([])
  })

  it('ticking a waiting player in Session settings checks them in; unticking never undoes a check-in', async () => {
    const { applySetup } = await import('@/utils/session/setup')
    const ctx = testContext()
    let s = createSession('owner', setupInput({ members: members([]) }), ctx)
    s = checkIn(s, ['Ana'], ctx)
    const edit = Object.values(s.players).map((p) => ({ id: p.id, name: p.name, tierId: p.tierId, checkedIn: p.name === 'Ben' }))
    ctx.tick()
    s = applySetup(s, setupInput({ members: edit }), ctx)
    expect(queueNames(s)).toEqual(['Ana', 'Ben'])
    expect(awaitingCheckIn(s).map((p) => p.name)).toEqual(['Cy', 'Dee'])
  })

  it('a player added from the board is checked in unless the box is unticked', () => {
    const ctx = testContext()
    let s = createSession('owner', setupInput({ members: [] }), ctx)
    s = addPlayer(s, { name: 'Eve', tierId: 'beginner' }, ctx)
    s = addPlayer(s, { name: 'Fin', tierId: 'beginner', checkedIn: false }, ctx)
    expect(queueNames(s)).toEqual(['Eve'])
    expect(awaitingCheckIn(s).map((p) => p.name)).toEqual(['Fin'])
  })
})
