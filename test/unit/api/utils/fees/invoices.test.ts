import type { FeeScheme } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import type { SessionState } from '@/interfaces/SessionState'
import { invoiceGroup, sessionInvoices } from '@/utils/fees/invoices'
import { finishMatch, removePlayer, startMatch } from '@/utils/session/engine'
import { applySetup, createSession } from '@/utils/session/setup'
import { checkInEveryone, readySession, setupInput, testContext } from '@test/session'

const perGame: FeeScheme = { kind: 'per-game', currency: 'USD', base: 0, perGame: 300 }
const basePlus: FeeScheme = { kind: 'base-per-game', currency: 'USD', base: 1_000, perGame: 250 }
const fixed: FeeScheme = { kind: 'fixed', currency: 'USD', base: 800, perGame: 0 }

/** Plays one match on the first court: the four players called first play a game each. */
function playOne(state: SessionState, ctx: ReturnType<typeof testContext>) {
  const court = state.courts[0]!.id
  return finishMatch(startMatch(state, court, ctx), court, [{ a: 21, b: 15 }, { a: 21, b: 17 }], ctx)
}

const owed = (state: SessionState, ctx = testContext()) => Object.fromEntries(sessionInvoices(state, ctx).map((i) => [i.name, [i.games, i.amount]]))

describe('sessionInvoices', () => {
  it('makes no invoices without a fee', () => {
    const ctx = testContext()
    expect(sessionInvoices(playOne(readySession(setupInput(), ctx), ctx), ctx)).toEqual([])
  })

  it('charges per game played, and nothing to those who played none', () => {
    const ctx = testContext()
    const state = playOne(readySession(setupInput({ fee: perGame }), ctx), ctx)
    expect(owed(state)).toEqual({ Ana: [1, 300], Ben: [1, 300], Cy: [1, 300], Dee: [1, 300] })
  })

  it('charges the base price to everyone who came, plus their games', () => {
    const ctx = testContext()
    const state = playOne(readySession(setupInput({ fee: basePlus }), ctx), ctx)
    const invoices = owed(state)
    expect(Object.keys(invoices)).toHaveLength(8)
    expect(invoices.Ana).toEqual([1, 1_250])
    expect(invoices.Hal).toEqual([0, 1_000])
  })

  it("doesn't charge players who never checked in, or were removed without playing", () => {
    const ctx = testContext()
    let state = createSession('o', setupInput({ fee: fixed }), ctx)
    const [ana, ben] = Object.values(state.players)
    state = checkInEveryone(state, ctx)
    state = removePlayer(state, ben!.id)
    // Someone added to the roster later, still not here.
    const roster = Object.values(state.players)
      .filter((p) => p.active)
      .map(({ id, name, tierId }) => ({ id, name, tierId }))
    const courts = state.courts.map(({ id, label }) => ({ id, label }))
    state = applySetup(state, { ...setupInput({ fee: fixed }), courts, members: [...roster, { id: 'new', name: 'Zed', tierId: 'beginner' }] }, ctx)
    const names = sessionInvoices(state, ctx).map((i) => i.name)
    expect(names).toContain(ana!.name)
    expect(names).not.toContain('Ben')
    expect(names).not.toContain('Zed')
  })

  it('keeps charging a removed player for the games they played', () => {
    const ctx = testContext()
    let state = playOne(readySession(setupInput({ fee: perGame }), ctx), ctx)
    const ana = Object.values(state.players).find((p) => p.name === 'Ana')!
    state = removePlayer(state, ana.id)
    expect(owed(state).Ana).toEqual([1, 300])
  })

  it('gives every invoice a server id and the currency', () => {
    const ctx = testContext()
    const invoices = sessionInvoices(readySession(setupInput({ fee: fixed }), ctx), ctx)
    expect(new Set(invoices.map((i) => i.id)).size).toBe(invoices.length)
    expect(invoices.every((i) => i.currency === 'USD' && i.amount === 800)).toBe(true)
  })
})

describe('invoiceGroup', () => {
  const session = { id: 's1', title: null, sportId: 'badminton' as const, clubId: null, clubName: null, endedAt: 'b', fee: basePlus }
  const record = (name: string, games: number, amount: number, paidAt: string | null = null) => ({
    id: name,
    playerId: name,
    name,
    games,
    amount,
    paidAt,
    payments: paidAt ? [{ id: `${name}-1`, amount, method: 'cash' as const, paidAt }] : [],
  })

  it('totals what was charged, paid and still owed', () => {
    const group = invoiceGroup(session, [record('Cy', 2, 1_500, '2026-11-10T10:00:00Z'), record('Ana', 0, 1_000), record('Ben', 4, 2_000)])
    expect(group).toMatchObject({ kind: 'session', sessionId: 's1', currency: 'USD', label: 'Badminton session', total: 4_500, paid: 1_500, outstanding: 3_000, paidCount: 1, summary: 'Fee: $10.00, plus $2.50 per game' })
    expect(group.invoices.map((i) => i.name)).toEqual(['Ana', 'Ben', 'Cy'])
    expect(group.invoices[1]!.breakdown).toBe('$10.00 + 4 games × $2.50')
  })

  it('has nothing owed without invoices', () => {
    expect(invoiceGroup(session, [])).toMatchObject({ total: 0, paid: 0, outstanding: 0, paidCount: 0 })
  })
})
