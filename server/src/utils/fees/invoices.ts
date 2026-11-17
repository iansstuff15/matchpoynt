import { sportRules, type FeeScheme, type InvoiceGroupView, type InvoicePayment, type InvoiceView, type SportId } from '@matchpoynt/shared'
import type { EngineContext, SessionState } from '@/interfaces/SessionState'
import { paymentState, paymentTotals } from '@/utils/fees/payments'
import { amountFor, downpaymentText, feeSummary, invoiceBreakdown } from '@/utils/fees/rules'

// Invoices: what each player owes when a session ends, and a session's
// invoices with their totals. Pure functions; the routes do the I/O.

/** An invoice as end_session writes it. */
export interface InvoiceDraft {
  id: string
  playerId: string
  name: string
  games: number
  amount: number
  currency: FeeScheme['currency']
}

/**
 * The invoices a session's fee makes when it ends: one for every player who
 * came (checked in and still on the roster) or played at least one game, by
 * name. Players who owe nothing (no games under a per-game fee) get none.
 * No fee, no invoices.
 */
export function sessionInvoices(state: SessionState, ctx: EngineContext): InvoiceDraft[] {
  const fee = state.settings.fee
  if (!fee) return []
  return Object.values(state.players)
    .filter((p) => (p.active && p.checkedInAt !== null) || p.gamesPlayed > 0)
    .map((p) => ({ playerId: p.id, name: p.name, games: p.gamesPlayed, amount: amountFor(fee, p.gamesPlayed) }))
    .filter((i) => i.amount > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((i) => ({ id: ctx.newId(), ...i, currency: fee.currency }))
}

/** A stored invoice, as the invoice queries load it. */
export interface InvoiceRecord {
  id: string
  playerId: string
  name: string
  games: number
  amount: number
  paidAt: string | null
  payments: InvoicePayment[]
}

/** The finished session an invoice group belongs to. */
export interface InvoiceSession {
  id: string
  title: string | null
  sportId: SportId
  clubId: string | null
  clubName: string | null
  endedAt: string
  fee: FeeScheme
}

/** An invoice as the pages show it: what's been paid towards it and what's left. */
export function invoiceView<T extends { amount: number; payments: InvoicePayment[] }>(record: T): T & Pick<InvoiceView, 'paidAmount' | 'balance' | 'status'> {
  return { ...record, ...paymentState(record.amount, record.payments) }
}

/** A session's invoices, by name, with their totals and the fee in words. */
export function invoiceGroup(session: InvoiceSession, records: InvoiceRecord[]): InvoiceGroupView {
  const invoices: InvoiceView[] = [...records]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => invoiceView({ ...r, breakdown: invoiceBreakdown(session.fee, r.games) }))
  return {
    id: session.id,
    kind: 'session',
    sessionId: session.id,
    label: session.title ?? `${sportRules[session.sportId]?.name ?? 'Court'} session`,
    sportId: session.sportId,
    clubId: session.clubId,
    clubName: session.clubName,
    date: session.endedAt,
    currency: session.fee.currency,
    summary: [`Fee: ${feeSummary(session.fee)}`, downpaymentText(session.fee)].filter(Boolean).join(' · '),
    notes: null,
    invoices,
    downpayment: session.fee.downpayment || null,
    ...paymentTotals(invoices),
  }
}
