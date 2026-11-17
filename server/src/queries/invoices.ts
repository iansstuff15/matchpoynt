import type { CurrencyCode, FeeScheme, InvoiceGroupView, SportId } from '@matchpoynt/shared'
import { features } from '@/config/features'
import type { Json, Tables } from '@/types/database'
import { invoiceGroup, type InvoiceRecord } from '@/utils/fees/invoices'
import { storedPayments, type PaymentRecord } from '@/utils/fees/payments'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

// Finished sessions' invoices, queried as the signed-in user: RLS limits
// every row to the sessions they own.

type SessionRow = Tables<'sessions'>

const toRecord = (r: Tables<'session_invoices'>): InvoiceRecord => ({
  id: r.id,
  playerId: r.player_id,
  name: r.name,
  games: r.games,
  amount: r.amount,
  paidAt: r.paid_at,
  payments: storedPayments(r.payments),
})

/** Names of the clubs that ran these sessions (only while clubs are on). */
async function clubNames(db: Db, rows: SessionRow[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.flatMap((r) => (r.club_id ? [r.club_id] : [])))]
  if (!ids.length || !features().web.clubs) return new Map()
  const { data, error } = await db.from('clubs').select('id, name').in('id', ids)
  dbFail(error)
  return new Map((data ?? []).map((c) => [c.id, c.name]))
}

/** Builds the groups for these sessions, loading their invoices and club names in one go. */
async function groupsFor(db: Db, rows: SessionRow[]): Promise<InvoiceGroupView[]> {
  if (!rows.length) return []
  const [invoices, clubs] = await Promise.all([
    db
      .from('session_invoices')
      .select('*')
      .in(
        'session_id',
        rows.map((r) => r.id),
      ),
    clubNames(db, rows),
  ])
  dbFail(invoices.error)
  return rows.map((row) =>
    invoiceGroup(
      {
        id: row.id,
        title: row.title,
        sportId: row.sport_id as SportId,
        clubId: row.club_id,
        clubName: row.club_id ? (clubs.get(row.club_id) ?? null) : null,
        endedAt: row.ended_at ?? row.updated_at,
        fee: row.fee as unknown as FeeScheme,
      },
      (invoices.data ?? []).filter((i) => i.session_id === row.id).map(toRecord),
    ),
  )
}

/** One finished session's invoices. `null` when it had no fee; `undefined` when it isn't the caller's, doesn't exist or is still running. */
export async function loadInvoiceGroup(db: Db, sessionId: string): Promise<InvoiceGroupView | null | undefined> {
  const { data: row, error } = await db.from('sessions').select('*').eq('id', sessionId).eq('status', 'ended').maybeSingle()
  dbFail(error)
  if (!row) return undefined
  if (!row.fee) return null
  return (await groupsFor(db, [row]))[0] ?? null
}

/** One invoice of a finished session of the caller's: what it's for and its payments; `null` when there's no such invoice (RLS hides others'). */
export async function loadSessionInvoice(db: Db, sessionId: string, invoiceId: string): Promise<{ amount: number; currency: CurrencyCode; payments: PaymentRecord['payments'] } | null> {
  const { data, error } = await db.from('session_invoices').select('amount, currency, payments').eq('session_id', sessionId).eq('id', invoiceId).maybeSingle()
  dbFail(error)
  return data ? { amount: data.amount, currency: data.currency as CurrencyCode, payments: storedPayments(data.payments) } : null
}

/** Saves an invoice's payments and the day it was paid in full. */
export async function saveSessionInvoicePayments(db: Db, sessionId: string, invoiceId: string, record: PaymentRecord): Promise<void> {
  const { error } = await db
    .from('session_invoices')
    .update({ payments: record.payments as unknown as Json, paid_at: record.paidAt })
    .eq('session_id', sessionId)
    .eq('id', invoiceId)
  dbFail(error)
}

/** Every finished session of a club that charged a fee, with its invoices (the club's Invoices page filters them by date). */
export async function loadClubSessionGroups(db: Db, clubId: string): Promise<InvoiceGroupView[]> {
  const { data, error } = await db.from('sessions').select('*').eq('club_id', clubId).eq('status', 'ended').not('fee', 'is', null)
  dbFail(error)
  return groupsFor(db, data ?? [])
}
