import { describe, expect, it } from 'vitest'
import { playerPayment } from '@/utils/fees/playerPayment'

const fee = { kind: 'base-per-game' as const, currency: 'PHP' as const, base: 10_000, perGame: 2_500, downpayment: 5_000 }

describe('playerPayment', () => {
  it("shows what the player owes, has paid and has left, with how it was worked out", () => {
    const view = playerPayment(fee, { amount: 20_000, currency: 'PHP', games: 4, payments: [{ id: 'p1', amount: 5_000, method: 'online', paidAt: '2026-11-20T10:00:00Z' }] })
    expect(view).toMatchObject({ currency: 'PHP', amount: 20_000, paidAmount: 5_000, balance: 15_000, status: 'partial', breakdown: '₱100.00 + 4 games × ₱25.00' })
    expect(view?.payments).toHaveLength(1)
  })

  it('is nothing without a fee or an invoice for them', () => {
    expect(playerPayment(null, { amount: 1, currency: 'PHP', games: 0, payments: [] })).toBeNull()
    expect(playerPayment(fee, null)).toBeNull()
  })
})
