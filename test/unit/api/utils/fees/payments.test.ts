import { describe, expect, it } from 'vitest'
import { markedPaid, paymentState, paymentTotals, storedPayments, withPayment, withoutPayment } from '@/utils/fees/payments'

const now = new Date('2026-11-20T10:00:00Z')
const later = new Date('2026-11-21T10:00:00Z')

describe('payments towards an invoice', () => {
  it('takes a downpayment, then the rest, and is paid in full on the day of the last payment', () => {
    const first = withPayment(15_000, [], { amount: 5_000, method: 'online' }, 'PHP', 'p1', now)
    expect(first.paidAt).toBeNull()
    expect(paymentState(15_000, first.payments)).toEqual({ paidAmount: 5_000, balance: 10_000, status: 'partial' })
    const rest = withPayment(15_000, first.payments, { amount: 10_000, method: 'cash' }, 'PHP', 'p2', later)
    expect(rest.paidAt).toBe(later.toISOString())
    expect(rest.payments.map((p) => p.method)).toEqual(['online', 'cash'])
    expect(paymentState(15_000, rest.payments).status).toBe('paid')
  })

  it('refuses more than what is left, nothing, or anything once paid', () => {
    const half = withPayment(10_000, [], { amount: 5_000, method: 'cash' }, 'PHP', 'p1', now).payments
    expect(() => withPayment(10_000, half, { amount: 6_000, method: 'cash' }, 'PHP', 'p2', now)).toThrow("That's more than what's left: ₱50.00.")
    expect(() => withPayment(10_000, half, { amount: 0, method: 'cash' }, 'PHP', 'p2', now)).toThrow('Enter how much was paid.')
    const full = markedPaid(10_000, half, true, 'online', 'p2', now).payments
    expect(() => withPayment(10_000, full, { amount: 1, method: 'cash' }, 'PHP', 'p3', now)).toThrow('This is paid in full already.')
  })

  it('marks paid by recording what is left, keeps an already-paid one, and clears every payment when unpaid', () => {
    const half = withPayment(10_000, [], { amount: 4_000, method: 'cash' }, 'PHP', 'p1', now).payments
    const full = markedPaid(10_000, half, true, 'online', 'p2', later)
    expect(full.payments.at(-1)).toEqual({ id: 'p2', amount: 6_000, method: 'online', paidAt: later.toISOString() })
    expect(markedPaid(10_000, full.payments, true, 'cash', 'p3', new Date()).payments).toHaveLength(2)
    expect(markedPaid(10_000, full.payments, false, 'cash', 'p3', now)).toEqual({ payments: [], paidAt: null })
  })

  it('removes a payment recorded by mistake, so it is owed again', () => {
    const full = markedPaid(10_000, [], true, 'cash', 'p1', now)
    expect(withoutPayment(10_000, full.payments, 'p1')).toEqual({ payments: [], paidAt: null })
    expect(() => withoutPayment(10_000, [], 'p1')).toThrow('That payment has been removed already.')
  })

  it('totals a group: paid includes partial payments, with how many paid in full or in part', () => {
    const totals = paymentTotals([
      { amount: 10_000, payments: [{ id: 'a', amount: 10_000, method: 'cash', paidAt: 'x' }] },
      { amount: 10_000, payments: [{ id: 'b', amount: 3_000, method: 'online', paidAt: 'x' }] },
      { amount: 10_000, payments: [] },
    ])
    expect(totals).toEqual({ total: 30_000, paid: 13_000, outstanding: 17_000, paidCount: 1, partialCount: 1 })
  })

  it('reads stored payments, dropping anything malformed and keeping old ones without a method', () => {
    expect(storedPayments([{ id: 'b', amount: 2, method: 'online', paidAt: '2' }, { id: 'a', amount: 1, method: null, paidAt: '1' }, { amount: -1 }, null])).toEqual([
      { id: 'a', amount: 1, method: null, paidAt: '1' },
      { id: 'b', amount: 2, method: 'online', paidAt: '2' },
    ])
    expect(storedPayments('nope')).toEqual([])
  })
})
