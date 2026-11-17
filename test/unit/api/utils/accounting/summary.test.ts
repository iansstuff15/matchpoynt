import { describe, expect, it } from 'vitest'
import { accountingSummary, dayIn, moneyTotals, type Ledger } from '@/utils/accounting/summary'

const ledger = (o: Partial<Ledger> = {}): Ledger => ({
  sessions: [
    { id: 's1', label: 'October night', endedAt: '2026-10-20T13:00:00Z' },
    { id: 's2', label: 'November night', endedAt: '2026-11-03T13:00:00Z' },
  ],
  invoices: [
    { sessionId: 's1', amount: 1_000, currency: 'PHP', payments: [{ amount: 1_000, paidAt: '2026-10-21T02:00:00Z' }] },
    { sessionId: 's1', amount: 1_000, currency: 'PHP', payments: [{ amount: 1_000, paidAt: '2026-11-02T02:00:00Z' }] },
    { sessionId: 's2', amount: 1_500, currency: 'PHP', payments: [] },
  ],
  expenses: [
    { amount: 700, currency: 'PHP', spentOn: '2026-10-20', sessionId: 's1', billerId: 'hall' },
    { amount: 300, currency: 'PHP', spentOn: '2026-11-01', sessionId: null, billerId: null },
    { amount: 400, currency: 'PHP', spentOn: '2026-11-03', sessionId: 's2', billerId: 'hall' },
  ],
  billers: [{ id: 'hall', name: 'City Hall' }],
  ...o,
})

const today = '2026-11-15'

describe('accountingSummary', () => {
  it('totals collected less spent, with invoiced and still owed beside it', () => {
    const [php] = accountingSummary(ledger(), { from: null, to: null }, 'UTC', today).currencies
    expect(php!.totals).toEqual({ invoiced: 3_500, collected: 2_000, outstanding: 1_500, expenses: 1_400, net: 600 })
    expect(php!.globalExpenses).toBe(300)
  })

  it('counts each month: invoiced when the session ended, collected when paid, spent when spent', () => {
    const [php] = accountingSummary(ledger(), { from: null, to: null }, 'UTC', today).currencies
    expect(php!.months.map((m) => [m.month, m.invoiced, m.collected, m.expenses, m.net])).toEqual([
      ['2026-10', 2_000, 1_000, 700, 300],
      ['2026-11', 1_500, 1_000, 700, 300],
    ])
    expect(php!.months[0]!.label).toBe('Oct 2026')
  })

  it('keeps to the date range, filling empty months', () => {
    const view = accountingSummary(ledger(), { from: '2026-09-01', to: '2026-10-31' }, 'UTC', today)
    const [php] = view.currencies
    expect(php!.months.map((m) => m.month)).toEqual(['2026-09', '2026-10'])
    expect(php!.totals).toEqual({ invoiced: 2_000, collected: 1_000, outstanding: 0, expenses: 700, net: 300 })
    expect(php!.sessions.map((s) => s.sessionId)).toEqual(['s1'])
  })

  it("gives each session its own takings and costs, newest first", () => {
    const [php] = accountingSummary(ledger(), { from: null, to: null }, 'UTC', today).currencies
    expect(php!.sessions.map((s) => [s.label, s.invoiced, s.collected, s.outstanding, s.expenses, s.net])).toEqual([
      ['November night', 1_500, 0, 1_500, 400, -400],
      ['October night', 2_000, 2_000, 0, 700, 1_300],
    ])
  })

  it('ranks spending by biller, with expenses that have none together', () => {
    const [php] = accountingSummary(ledger(), { from: null, to: null }, 'UTC', today).currencies
    expect(php!.billers).toEqual([
      { billerId: 'hall', name: 'City Hall', expenses: 1_100, count: 2 },
      { billerId: null, name: 'No biller', expenses: 300, count: 1 },
    ])
  })

  it("counts days in the viewer's time zone", () => {
    // 20:00 UTC on Oct 31 is already Nov 1 in Manila.
    const late = ledger({ sessions: [{ id: 's1', label: 'Late', endedAt: '2026-10-31T20:00:00Z' }], invoices: [{ sessionId: 's1', amount: 500, currency: 'PHP', payments: [] }], expenses: [] })
    expect(accountingSummary(late, { from: null, to: null }, 'UTC', today).currencies[0]!.months[0]!.month).toBe('2026-10')
    expect(accountingSummary(late, { from: null, to: null }, 'Asia/Manila', today).currencies[0]!.months[0]!.invoiced).toBe(500)
    expect(accountingSummary(late, { from: '2026-11-01', to: '2026-11-30' }, 'Asia/Manila', today).currencies[0]!.totals.invoiced).toBe(500)
    expect(dayIn('2026-10-31T20:00:00Z', 'Asia/Manila')).toBe('2026-11-01')
  })

  it('keeps currencies apart, the busiest first, and shows nothing for a club with no money yet', () => {
    const mixed = ledger({ expenses: [...ledger().expenses, { amount: 50_000, currency: 'USD', spentOn: '2026-11-04', sessionId: null, billerId: null }] })
    expect(accountingSummary(mixed, { from: null, to: null }, 'UTC', today).currencies.map((c) => c.currency)).toEqual(['USD', 'PHP'])
    expect(accountingSummary(ledger({ invoices: [], expenses: [] }), { from: null, to: null }, 'UTC', today).currencies).toEqual([])
  })

  it('counts manual invoices on the day they were issued, outside any session', () => {
    const manual = ledger({
      invoices: [...ledger().invoices, { sessionId: null, day: '2026-09-30', amount: 2_000, currency: 'PHP', payments: [{ amount: 2_000, paidAt: '2026-11-04T01:00:00Z' }] }],
    })
    const [php] = accountingSummary(manual, { from: null, to: null }, 'UTC', today).currencies
    expect(php!.months.find((m) => m.month === '2026-09')!.invoiced).toBe(2_000)
    expect(php!.months.find((m) => m.month === '2026-11')!.collected).toBe(3_000)
    expect(php!.totals.collected).toBe(4_000)
    expect(php!.sessions.map((s) => s.sessionId)).toEqual(['s2', 's1'])
  })

  it('totals money per currency', () => {
    expect(moneyTotals([{ amount: 1, currency: 'PHP' }, { amount: 5, currency: 'USD' }, { amount: 2, currency: 'PHP' }])).toEqual([
      { currency: 'USD', amount: 5 },
      { currency: 'PHP', amount: 3 },
    ])
  })
})
