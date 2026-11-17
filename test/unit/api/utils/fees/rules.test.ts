import type { FeeScheme } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import { amountFor, cleanFee, feeSummary, formatMoney, invoiceBreakdown, keptFee, validateFee } from '@/utils/fees/rules'

const fee = (o: Partial<FeeScheme> = {}): FeeScheme => ({ kind: 'fixed', currency: 'PHP', base: 15_000, perGame: 0, ...o })

describe('validateFee', () => {
  it('accepts no fee and complete schemes', () => {
    expect(validateFee(null)).toBeNull()
    expect(validateFee(fee())).toBeNull()
    expect(validateFee(fee({ kind: 'per-game', base: 0, perGame: 5_000 }))).toBeNull()
    expect(validateFee(fee({ kind: 'base-per-game', base: 10_000, perGame: 5_000 }))).toBeNull()
  })

  it('asks for the amount each kind needs', () => {
    expect(validateFee(fee({ base: 0 }))).toContain('No fee')
    expect(validateFee(fee({ kind: 'per-game', perGame: 0 }))).toContain('price per game')
    expect(validateFee(fee({ kind: 'base-per-game', base: 0, perGame: 5_000 }))).toContain('base price')
    expect(validateFee(fee({ kind: 'base-per-game', base: 10_000, perGame: 0 }))).toContain('price per game')
  })

  it('refuses amounts that are not money', () => {
    expect(validateFee(fee({ base: -100 }))).toContain('amount of money')
    expect(validateFee(fee({ base: 10.5 }))).toContain('amount of money')
    expect(validateFee(fee({ base: 10_000_001 }))).toContain('up to 100,000')
    expect(validateFee(fee({ currency: 'XXX' as FeeScheme['currency'] }))).toContain('currency')
  })
})

describe('cleanFee', () => {
  it('saves 0 for the amount a kind does not use', () => {
    expect(cleanFee(fee({ kind: 'fixed', perGame: 5_000 }))).toEqual(fee({ perGame: 0 }))
    expect(cleanFee(fee({ kind: 'per-game', base: 9_000, perGame: 5_000 }))).toEqual(fee({ kind: 'per-game', base: 0, perGame: 5_000 }))
  })

  it('names the field at fault', () => {
    try {
      cleanFee(fee({ base: 0 }))
      expect.unreachable()
    } catch (e) {
      expect((e as { fields: object }).fields).toHaveProperty('fee')
    }
  })
})

describe('amounts', () => {
  it('charges each kind as it says', () => {
    expect(amountFor(fee(), 7)).toBe(15_000)
    expect(amountFor(fee({ kind: 'per-game', perGame: 5_000 }), 3)).toBe(15_000)
    expect(amountFor(fee({ kind: 'base-per-game', base: 10_000, perGame: 5_000 }), 4)).toBe(30_000)
    expect(amountFor(fee({ kind: 'base-per-game', base: 10_000, perGame: 5_000 }), 0)).toBe(10_000)
  })
})

describe('wording', () => {
  it('formats money in the currency', () => {
    expect(formatMoney(125_050, 'USD')).toBe('$1,250.50')
  })

  it('describes the fee and how an invoice was worked out', () => {
    const usd = fee({ kind: 'base-per-game', currency: 'USD', base: 1_000, perGame: 250 })
    expect(feeSummary(usd)).toBe('$10.00, plus $2.50 per game')
    expect(invoiceBreakdown(usd, 1)).toBe('$10.00 + 1 game × $2.50')
    expect(feeSummary(fee({ currency: 'USD', base: 500 }))).toBe('$5.00 per player')
    expect(invoiceBreakdown(fee({ kind: 'per-game', currency: 'USD', base: 0, perGame: 300 }), 4)).toBe('4 games × $3.00')
  })
})

describe('downpayments', () => {
  const fixed = { kind: 'fixed' as const, currency: 'PHP' as const, base: 15_000, perGame: 0 }
  it('allows a downpayment less than a fixed fee, keeps it when saved, and refuses one as big as the fee', () => {
    expect(validateFee({ ...fixed, downpayment: 5_000 })).toBeNull()
    expect(keptFee({ ...fixed, downpayment: 5_000 })?.downpayment).toBe(5_000)
    expect(keptFee({ ...fixed, downpayment: 0 })).not.toHaveProperty('downpayment')
    expect(validateFee({ ...fixed, downpayment: 15_000 })).toBe('Make the downpayment less than the fee, or leave it at 0.')
    expect(validateFee({ ...fixed, downpayment: -1 })).toMatch(/^The downpayment must be an amount/)
  })
})
