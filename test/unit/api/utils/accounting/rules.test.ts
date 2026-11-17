import type { ExpenseInput } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import { addBillerBlockedReason, cleanBiller, cleanExpense, cleanRange, cleanTimeZone, isDay } from '@/utils/accounting/rules'

const club = { billerIds: new Set(['b1']), sessionIds: new Set(['s1']) }
const expense = (o: Partial<ExpenseInput> = {}): ExpenseInput => ({
  description: 'Court hire',
  amount: 250_000,
  currency: 'PHP',
  spentOn: '2026-11-05',
  billerId: 'b1',
  sessionId: 's1',
  notes: null,
  ...o,
})

const fieldsOf = (fn: () => unknown) => {
  try {
    fn()
  } catch (e) {
    return (e as { fields: Record<string, string> }).fields
  }
  throw new Error('expected it to throw')
}

describe('billers', () => {
  it('tidies a biller and keeps empty details as none', () => {
    expect(cleanBiller({ name: '  City   Sports Hall ', contact: ' ', notes: null }, [])).toEqual({ name: 'City Sports Hall', contact: null, notes: null })
  })

  it('refuses no name, a long name or a name already listed', () => {
    expect(fieldsOf(() => cleanBiller({ name: ' ', contact: null, notes: null }, []))).toHaveProperty('name')
    expect(fieldsOf(() => cleanBiller({ name: 'x'.repeat(81), contact: null, notes: null }, []))).toHaveProperty('name')
    expect(() => cleanBiller({ name: 'city sports hall', contact: null, notes: null }, [{ name: 'City Sports Hall' }])).toThrow("There's already a biller called city sports hall.")
  })

  it('caps how many billers a club lists', () => {
    expect(addBillerBlockedReason(199)).toBeNull()
    expect(addBillerBlockedReason(200)).toContain('up to 200')
  })
})

describe('expenses', () => {
  it('accepts a session expense with a biller, and a club-wide one with neither', () => {
    expect(cleanExpense(expense({ description: '  Court hire ', notes: ' ' }), club)).toEqual(expense())
    expect(cleanExpense(expense({ billerId: null, sessionId: null }), club)).toMatchObject({ billerId: null, sessionId: null })
  })

  it('names every problem by field', () => {
    const fields = fieldsOf(() => cleanExpense(expense({ description: '', amount: 0, spentOn: '2026-02-30', billerId: 'other', sessionId: 'elsewhere' }), club))
    expect(Object.keys(fields).sort()).toEqual(['amount', 'billerId', 'description', 'sessionId', 'spentOn'])
    expect(fieldsOf(() => cleanExpense(expense({ amount: 10.5 }), club))).toHaveProperty('amount')
  })
})

describe('dates', () => {
  it('knows real days', () => {
    expect(isDay('2024-02-29')).toBe(true)
    expect(isDay('2026-02-29')).toBe(false)
    expect(isDay('2026-1-05')).toBe(false)
  })

  it('takes open or closed ranges, refusing backwards or too wide ones', () => {
    expect(cleanRange(undefined, undefined)).toEqual({ from: null, to: null })
    expect(cleanRange('2026-01-01', undefined)).toEqual({ from: '2026-01-01', to: null })
    expect(() => cleanRange('2026-05-01', '2026-04-01')).toThrow('start date is after the end date')
    expect(() => cleanRange('2020-01-01', '2026-01-01')).toThrow('up to 5 years')
    expect(() => cleanRange('yesterday', undefined)).toThrow('not a real day')
  })

  it('counts days in a real time zone, UTC by default', () => {
    expect(cleanTimeZone(undefined)).toBe('UTC')
    expect(cleanTimeZone('Asia/Manila')).toBe('Asia/Manila')
    expect(() => cleanTimeZone('Mars/Olympus')).toThrow("isn't a time zone")
  })
})
