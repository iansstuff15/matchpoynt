import type { CurrencyCode, ManualInvoiceInput } from '@matchpoynt/shared'
import type { Json } from '@/types/database'
import type { ManualInvoiceRecord, PayerDraft } from '@/utils/accounting/invoices'
import { storedPayments, type PaymentRecord } from '@/utils/fees/payments'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

// A club's manual invoices and their payers, queried as the signed-in user:
// RLS limits every row to the caller's clubs.

/** The club's manual invoices issued in the range (YYYY-MM-DD, inclusive; open ends allowed), newest first, with their payers. */
export async function listManualInvoices(db: Db, clubId: string, clubName: string | null, from: string | null, to: string | null): Promise<ManualInvoiceRecord[]> {
  let query = db.from('club_invoices').select('*').eq('club_id', clubId)
  if (from) query = query.gte('issued_on', from)
  if (to) query = query.lte('issued_on', to)
  const { data, error } = await query.order('issued_on', { ascending: false }).order('created_at', { ascending: false })
  dbFail(error)
  const rows = data ?? []
  if (!rows.length) return []
  const payers = await db
    .from('club_invoice_payers')
    .select('*')
    .in(
      'invoice_id',
      rows.map((r) => r.id),
    )
    .order('position')
  dbFail(payers.error)
  return rows.map((r) => ({
    id: r.id,
    clubId: r.club_id,
    clubName,
    title: r.title,
    notes: r.notes,
    currency: r.currency as CurrencyCode,
    issuedOn: r.issued_on,
    amount: r.amount,
    split: r.split as ManualInvoiceInput['split'],
    payers: (payers.data ?? []).filter((p) => p.invoice_id === r.id).map((p) => ({ id: p.id, memberId: p.member_id, name: p.name, amount: p.amount, paidAt: p.paid_at, payments: storedPayments(p.payments) })),
  }))
}

export async function countManualInvoices(db: Db, clubId: string): Promise<number> {
  const { count, error } = await db.from('club_invoices').select('id', { count: 'exact', head: true }).eq('club_id', clubId)
  dbFail(error)
  return count ?? 0
}

/** Writes the invoice and its payers in one transaction (create_club_invoice). */
export async function createManualInvoice(db: Db, clubId: string, id: string, invoice: ManualInvoiceInput, payers: PayerDraft[]): Promise<void> {
  const { error } = await db.rpc('create_club_invoice', {
    p_invoice: { id, club_id: clubId, title: invoice.title, notes: invoice.notes, currency: invoice.currency, issued_on: invoice.issuedOn, amount: invoice.amount, split: invoice.split },
    p_payers: payers.map((p) => ({ id: p.id, member_id: p.memberId, name: p.name, amount: p.amount, position: p.position })),
  })
  dbFail(error)
}

/** Its payers go with it. `false` when the club has no such invoice. */
export async function deleteManualInvoice(db: Db, clubId: string, id: string): Promise<boolean> {
  const { data, error } = await db.from('club_invoices').delete().eq('club_id', clubId).eq('id', id).select('id')
  dbFail(error)
  return Boolean(data?.length)
}

/** One payer of one of the club's manual invoices: what they owe and their payments; `null` when there's no such payer (or it isn't the caller's club's). */
export async function loadPayer(db: Db, clubId: string, invoiceId: string, payerId: string): Promise<{ amount: number; currency: CurrencyCode; payments: PaymentRecord['payments'] } | null> {
  const owner = await db.from('club_invoices').select('currency').eq('club_id', clubId).eq('id', invoiceId).maybeSingle()
  dbFail(owner.error)
  if (!owner.data) return null
  const { data, error } = await db.from('club_invoice_payers').select('amount, payments').eq('invoice_id', invoiceId).eq('id', payerId).maybeSingle()
  dbFail(error)
  return data ? { amount: data.amount, currency: owner.data.currency as CurrencyCode, payments: storedPayments(data.payments) } : null
}

/** Saves a payer's payments and the day they paid in full. */
export async function savePayerPayments(db: Db, invoiceId: string, payerId: string, record: PaymentRecord): Promise<void> {
  const { error } = await db
    .from('club_invoice_payers')
    .update({ payments: record.payments as unknown as Json, paid_at: record.paidAt })
    .eq('invoice_id', invoiceId)
    .eq('id', payerId)
  dbFail(error)
}

/** Every payer of the club's manual invoices, for the accounting ledger. */
export async function loadManualLedger(db: Db, clubId: string) {
  const invoices = await db.from('club_invoices').select('id, issued_on, currency').eq('club_id', clubId)
  dbFail(invoices.error)
  const rows = invoices.data ?? []
  if (!rows.length) return []
  const payers = await db
    .from('club_invoice_payers')
    .select('invoice_id, amount, payments')
    .in(
      'invoice_id',
      rows.map((r) => r.id),
    )
  dbFail(payers.error)
  const byId = new Map(rows.map((r) => [r.id, r]))
  return (payers.data ?? []).map((p) => {
    const invoice = byId.get(p.invoice_id)!
    return { sessionId: null, day: invoice.issued_on, amount: p.amount, currency: invoice.currency as CurrencyCode, payments: storedPayments(p.payments) }
  })
}
