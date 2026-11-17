import type { ClubMemberView, ManualInvoiceInput } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import { cleanManualInvoice, manualGroup, payerAmounts } from '@/utils/accounting/invoices'

const members: ClubMemberView[] = [
  { id: 'm1', role: 'member', name: 'Ana Cruz', contact: null, email: null, linked: false, invite: null, badges: [], username: null, avatarUrl: null, tiers: [] },
  { id: 'm2', role: 'member', name: 'Ben Lim', contact: null, email: null, linked: false, invite: null, badges: [], username: null, avatarUrl: null, tiers: [] },
]
const input = (o: Partial<ManualInvoiceInput> = {}): ManualInvoiceInput => ({
  title: 'Club shirts',
  notes: null,
  currency: 'PHP',
  issuedOn: '2026-11-05',
  amount: 50_000,
  split: 'each',
  payers: [
    { memberId: 'm1', name: '' },
    { memberId: null, name: '  Guest   Player ' },
  ],
  ...o,
})
let n = 0
const newId = () => `p${++n}`

describe('payerAmounts', () => {
  it('charges everyone the amount, or shares a total, leftover cents to the first payers', () => {
    expect(payerAmounts(500, 'each', 3)).toEqual([500, 500, 500])
    expect(payerAmounts(1_000, 'total', 3)).toEqual([334, 333, 333])
    expect(payerAmounts(1_000, 'total', 4)).toEqual([250, 250, 250, 250])
  })
})

describe('cleanManualInvoice', () => {
  it("names members as on the roster and tidies typed names, with each payer's amount", () => {
    const { invoice, payers } = cleanManualInvoice(input(), members, newId)
    expect(invoice.title).toBe('Club shirts')
    expect(payers.map((p) => [p.memberId, p.name, p.amount, p.position])).toEqual([
      ['m1', 'Ana Cruz', 50_000, 0],
      [null, 'Guest Player', 50_000, 1],
    ])
  })

  it('shares a total between the payers', () => {
    const { payers } = cleanManualInvoice(input({ split: 'total', amount: 100_001 }), members, newId)
    expect(payers.map((p) => p.amount)).toEqual([50_001, 50_000])
  })

  it('refuses a missing title, amount or payers, someone twice, or a member who left', () => {
    expect(() => cleanManualInvoice(input({ title: ' ' }), members, newId)).toThrow('Say what the invoice is for.')
    expect(() => cleanManualInvoice(input({ amount: 0 }), members, newId)).toThrow('Enter the amount')
    expect(() => cleanManualInvoice(input({ payers: [] }), members, newId)).toThrow('Add who pays')
    expect(() => cleanManualInvoice(input({ payers: [{ memberId: null, name: 'Ana' }, { memberId: null, name: 'ana' }] }), members, newId)).toThrow('on the invoice once')
    expect(() => cleanManualInvoice(input({ payers: [{ memberId: 'gone', name: '' }] }), members, newId)).toThrow("aren't members")
    expect(() => cleanManualInvoice(input({ issuedOn: '2026-13-01' }), members, newId)).toThrow('day it was issued')
    expect(() => cleanManualInvoice(input({ split: 'total', amount: 1 }), members, newId)).toThrow('too small to share')
  })
})

describe('manualGroup', () => {
  it('shows payers in order with totals and what is owed in words', () => {
    const group = manualGroup({
      id: 'i1',
      clubId: 'c1',
      clubName: 'Smash Club',
      title: 'Tournament entry',
      notes: 'Due Friday',
      currency: 'USD',
      issuedOn: '2026-11-05',
      amount: 3_000,
      split: 'total',
      payers: [
        { id: 'a', memberId: 'm1', name: 'Zed', amount: 1_500, paidAt: '2026-11-06T00:00:00Z', payments: [{ id: 'p1', amount: 1_500, method: 'cash', paidAt: '2026-11-06T00:00:00Z' }] },
        { id: 'b', memberId: null, name: 'Amy', amount: 1_500, paidAt: null, payments: [] },
      ],
    })
    expect(group).toMatchObject({ kind: 'manual', sessionId: null, sportId: null, label: 'Tournament entry', summary: '$30.00 split between 2 payers', total: 3_000, paid: 1_500, outstanding: 1_500, paidCount: 1 })
    expect(group.invoices.map((i) => [i.name, i.games, i.breakdown])).toEqual([
      ['Zed', null, 'Share of $30.00'],
      ['Amy', null, 'Share of $30.00'],
    ])
  })
})
