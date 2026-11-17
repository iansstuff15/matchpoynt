import type { FeeScheme, PlayerPaymentView } from '@matchpoynt/shared'
import { paymentState, storedPayments } from '@/utils/fees/payments'
import { invoiceBreakdown } from '@/utils/fees/rules'

/** The viewer's invoice for a session as player_ended_session returns it. */
export interface PlayerInvoiceRow {
  amount: number
  currency: string
  games: number
  payments: unknown
}

/**
 * What a player owes for a session, for their ended screen and session
 * history: the amount, what they've paid and have left, how it was worked out
 * and their payments. `null` without a fee or an invoice for them.
 */
export function playerPayment(fee: FeeScheme | null, invoice: PlayerInvoiceRow | null): PlayerPaymentView | null {
  if (!fee || !invoice) return null
  const payments = storedPayments(invoice.payments)
  return {
    currency: fee.currency,
    amount: invoice.amount,
    ...paymentState(invoice.amount, payments),
    breakdown: invoiceBreakdown(fee, invoice.games),
    payments,
  }
}
