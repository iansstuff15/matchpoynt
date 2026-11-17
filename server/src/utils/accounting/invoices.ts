import { accountingLimits, feeCurrencies, feeLimits, type ClubMemberView, type InvoiceGroupView, type InvoicePayment, type ManualInvoiceInput } from '@matchpoynt/shared'
import { isDay } from '@/utils/accounting/rules'
import { formatMoney } from '@/utils/fees/rules'
import { invoiceView } from '@/utils/fees/invoices'
import { paymentTotals } from '@/utils/fees/payments'
import { invalid } from '@/utils/http/errors'

// Manual club invoices: made by hand, outside sessions. What a valid one
// looks like, what each payer owes, and the invoice as the pages show it.
// Pure functions; the routes do the I/O.

/** A payer as create_club_invoice writes them. */
export interface PayerDraft {
  id: string
  memberId: string | null
  name: string
  amount: number
  position: number
}

/**
 * Each payer's share: the amount itself (`each`), or the total shared
 * evenly, with the cents that don't divide going one each to the first payers.
 */
export function payerAmounts(amount: number, split: ManualInvoiceInput['split'], payers: number): number[] {
  if (split === 'each') return Array.from({ length: payers }, () => amount)
  const base = Math.floor(amount / payers)
  const extra = amount - base * payers
  return Array.from({ length: payers }, (_, i) => base + (i < extra ? 1 : 0))
}

type Field = 'title' | 'amount' | 'currency' | 'issuedOn' | 'payers' | 'notes'

/**
 * Checks a manual invoice against the club: what it's for, an amount above
 * zero, a real day, and one to `maxPayers` payers, each a member of the club
 * (named as on the roster) or a typed name, nobody twice. Returns the payers
 * with what each owes.
 */
export function cleanManualInvoice(input: ManualInvoiceInput, members: ClubMemberView[], newId: () => string): { invoice: ManualInvoiceInput; payers: PayerDraft[] } {
  const errors: Partial<Record<Field, string>> = {}
  const title = input.title.trim()
  if (!title) errors.title = 'Say what the invoice is for.'
  else if (title.length > accountingLimits.invoiceTitleMaxLength) errors.title = `Keep it to ${accountingLimits.invoiceTitleMaxLength} characters.`
  if (!Number.isInteger(input.amount) || input.amount <= 0) errors.amount = 'Enter the amount, like 150 or 150.50.'
  else if (input.amount > feeLimits.maxAmount * 10) errors.amount = `An invoice can be up to ${((feeLimits.maxAmount * 10) / feeLimits.minorPerUnit).toLocaleString('en')}.`
  if (!(input.currency in feeCurrencies)) errors.currency = 'Pick a currency from the list.'
  if (!isDay(input.issuedOn)) errors.issuedOn = 'Pick the day it was issued.'
  if ((input.notes?.trim().length ?? 0) > accountingLimits.notesMaxLength) errors.notes = `Notes can be up to ${accountingLimits.notesMaxLength} characters.`

  const byId = new Map(members.map((m) => [m.id, m]))
  const named = input.payers.map((p) => ({ memberId: p.memberId, name: (p.memberId ? byId.get(p.memberId)?.name : p.name)?.trim().replace(/\s+/g, ' ') ?? '' }))
  const keys = named.map((p) => p.memberId ?? p.name.toLowerCase())
  if (!named.length) errors.payers = 'Add who pays: club members or anyone else by name.'
  else if (named.length > accountingLimits.maxPayers) errors.payers = `An invoice can have up to ${accountingLimits.maxPayers} payers.`
  else if (input.payers.some((p) => p.memberId && !byId.has(p.memberId))) errors.payers = "Some payers aren't members of this club any more. Pick them again."
  else if (named.some((p) => !p.name)) errors.payers = 'Every payer needs a name.'
  else if (named.some((p) => p.name.length > 60)) errors.payers = 'Payer names can be up to 60 characters.'
  else if (new Set(keys).size !== keys.length) errors.payers = 'Each payer can be on the invoice once.'
  else if (input.split === 'total' && Number.isInteger(input.amount) && input.amount < named.length) errors.amount = 'The total is too small to share between this many payers.'

  const first = Object.values(errors).find(Boolean)
  if (first) throw invalid(first, errors as Record<string, string>)

  const amounts = payerAmounts(input.amount, input.split, named.length)
  return {
    invoice: { ...input, title, notes: input.notes?.trim() ? input.notes.trim() : null, payers: named },
    payers: named.map((p, position) => ({ id: newId(), memberId: p.memberId, name: p.name, amount: amounts[position]!, position })),
  }
}

/** A stored manual invoice, as the queries load it. */
export interface ManualInvoiceRecord {
  id: string
  clubId: string
  clubName: string | null
  title: string
  notes: string | null
  currency: ManualInvoiceInput['currency']
  issuedOn: string
  amount: number
  split: ManualInvoiceInput['split']
  payers: { id: string; memberId: string | null; name: string; amount: number; paidAt: string | null; payments: InvoicePayment[] }[]
}

/** A manual invoice as the invoice pages show it: payers in the order they were added, totals, and what's owed in words. */
export function manualGroup(record: ManualInvoiceRecord): InvoiceGroupView {
  const money = (minor: number) => formatMoney(minor, record.currency)
  const count = record.payers.length
  const invoices = record.payers.map((p) =>
    invoiceView({
      id: p.id,
      playerId: p.memberId,
      name: p.name,
      games: null,
      amount: p.amount,
      breakdown: record.split === 'each' ? 'Each pays the same' : `Share of ${money(record.amount)}`,
      paidAt: p.paidAt,
      payments: p.payments,
    }),
  )
  return {
    id: record.id,
    kind: 'manual',
    sessionId: null,
    label: record.title,
    sportId: null,
    clubId: record.clubId,
    clubName: record.clubName,
    date: record.issuedOn,
    currency: record.currency,
    summary: record.split === 'each' ? `${money(record.amount)} each` : `${money(record.amount)} split between ${count} ${count === 1 ? 'payer' : 'payers'}`,
    notes: record.notes,
    invoices,
    downpayment: null,
    ...paymentTotals(invoices),
  }
}

export function addInvoiceBlockedReason(count: number): string | null {
  return count >= accountingLimits.maxInvoices ? `A club can keep up to ${accountingLimits.maxInvoices.toLocaleString('en')} invoices. Delete old ones to make room.` : null
}
