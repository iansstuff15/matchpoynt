import type { InvoicePayment, InvoicePaymentInput, PaymentMethod, PaymentStatus } from '@matchpoynt/shared'
import { formatMoney } from '@/utils/fees/rules'
import { invalid } from '@/utils/http/errors'
import type { CurrencyCode } from '@matchpoynt/shared'

// Payments towards an invoice: in parts (a downpayment, then the rest) or in
// full, each in cash or online. Pure: the queries store the list and the day
// it was paid in full.

/** What's been paid and what's left of `amount`, and where that leaves it. */
export function paymentState(amount: number, payments: Pick<InvoicePayment, 'amount'>[]): { paidAmount: number; balance: number; status: PaymentStatus } {
  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const balance = Math.max(0, amount - paidAmount)
  return { paidAmount, balance, status: balance === 0 && amount > 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid' }
}

/** Payments as they were stored, tidied (anything malformed dropped), oldest first. */
export function storedPayments(raw: unknown): InvoicePayment[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p): p is InvoicePayment => Boolean(p) && typeof p.id === 'string' && Number.isInteger(p.amount) && p.amount > 0 && typeof p.paidAt === 'string')
    .map((p) => ({ id: p.id, amount: p.amount, method: p.method === 'cash' || p.method === 'online' ? p.method : null, paidAt: p.paidAt }))
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt))
}

/** An invoice's payments and the day it was paid in full (the latest payment's, once they cover it), as they're saved. */
export interface PaymentRecord {
  payments: InvoicePayment[]
  paidAt: string | null
}

const settled = (amount: number, payments: InvoicePayment[]): PaymentRecord => ({
  payments,
  paidAt: paymentState(amount, payments).status === 'paid' ? (payments.at(-1)?.paidAt ?? null) : null,
})

/** Why a payment can't be recorded (nothing left to pay, or more than what's left), or `null`. */
export function paymentBlockedReason(amount: number, payments: InvoicePayment[], input: InvoicePaymentInput, currency: CurrencyCode): string | null {
  const { balance } = paymentState(amount, payments)
  if (balance === 0) return 'This is paid in full already.'
  if (!Number.isInteger(input.amount) || input.amount <= 0) return 'Enter how much was paid.'
  if (input.amount > balance) return `That's more than what's left: ${formatMoney(balance, currency)}.`
  return null
}

/** Records a payment (part of it, or the rest). Throws `invalid` when it can't. */
export function withPayment(amount: number, payments: InvoicePayment[], input: InvoicePaymentInput, currency: CurrencyCode, id: string, now: Date): PaymentRecord {
  const problem = paymentBlockedReason(amount, payments, input, currency)
  if (problem) throw invalid(problem, { amount: problem })
  return settled(amount, [...payments, { id, amount: input.amount, method: input.method, paidAt: now.toISOString() }])
}

/** Removes one payment (recorded by mistake). Throws `invalid` when there's no such payment. */
export function withoutPayment(amount: number, payments: InvoicePayment[], paymentId: string): PaymentRecord {
  if (!payments.some((p) => p.id === paymentId)) throw invalid('That payment has been removed already.')
  return settled(amount, payments.filter((p) => p.id !== paymentId))
}

/**
 * Paid in full: what's left is recorded as one payment by `method` (an
 * invoice already paid keeps its payments and day). Unpaid: every payment is
 * cleared.
 */
export function markedPaid(amount: number, payments: InvoicePayment[], paid: boolean, method: PaymentMethod, id: string, now: Date): PaymentRecord {
  if (!paid) return { payments: [], paidAt: null }
  const { balance } = paymentState(amount, payments)
  if (balance === 0) return settled(amount, payments)
  return settled(amount, [...payments, { id, amount: balance, method, paidAt: now.toISOString() }])
}

/** A group's totals: owed, paid (payments, partial ones included), left, and how many paid in full or in part. */
export function paymentTotals(invoices: { amount: number; payments: InvoicePayment[] }[]) {
  let total = 0
  let paid = 0
  let paidCount = 0
  let partialCount = 0
  for (const i of invoices) {
    const state = paymentState(i.amount, i.payments)
    total += i.amount
    paid += Math.min(state.paidAmount, i.amount)
    if (state.status === 'paid') paidCount++
    else if (state.status === 'partial') partialCount++
  }
  return { total, paid, outstanding: total - paid, paidCount, partialCount }
}
