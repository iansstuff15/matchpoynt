import { storedPayments } from '@/utils/fees/payments'
import { accountingLimits, sportRules, type BillerInput, type BillerView, type CurrencyCode, type ExpenseInput, type ExpenseView, type SportId } from '@matchpoynt/shared'
import type { Tables } from '@/types/database'
import type { Ledger } from '@/utils/accounting/summary'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

// Club billers and expenses, and the ledger the accounting dashboard is built
// from, queried as the signed-in user: RLS limits every row to their clubs.

const sessionLabel = (r: { title: string | null; sport_id: string }) => r.title ?? `${sportRules[r.sport_id as SportId]?.name ?? 'Court'} session`

// Billers

/** The club's billers by name, with how many expenses each has. */
export async function loadBillers(db: Db, clubId: string): Promise<BillerView[]> {
  const [billers, expenses] = await Promise.all([
    db.from('club_billers').select('*').eq('club_id', clubId).order('name'),
    db.from('club_expenses').select('biller_id').eq('club_id', clubId).not('biller_id', 'is', null),
  ])
  dbFail(billers.error ?? expenses.error)
  const counts = new Map<string, number>()
  for (const e of expenses.data ?? []) counts.set(e.biller_id!, (counts.get(e.biller_id!) ?? 0) + 1)
  return (billers.data ?? []).map((b) => ({ id: b.id, name: b.name, contact: b.contact, notes: b.notes, expenses: counts.get(b.id) ?? 0 }))
}

export async function createBiller(db: Db, clubId: string, id: string, biller: BillerInput): Promise<void> {
  const { error } = await db.from('club_billers').insert({ id, club_id: clubId, ...biller })
  dbFail(error)
}

/** `false` when the club has no such biller. */
export async function updateBiller(db: Db, clubId: string, id: string, biller: BillerInput): Promise<boolean> {
  const { data, error } = await db.from('club_billers').update(biller).eq('club_id', clubId).eq('id', id).select('id')
  dbFail(error)
  return Boolean(data?.length)
}

/** Its expenses stay, with no biller. `false` when the club has no such biller. */
export async function deleteBiller(db: Db, clubId: string, id: string): Promise<boolean> {
  const { data, error } = await db.from('club_billers').delete().eq('club_id', clubId).eq('id', id).select('id')
  dbFail(error)
  return Boolean(data?.length)
}

// Expenses

export interface ExpenseFilter {
  from: string | null
  to: string | null
  billerId: string | null
  /** `global`, `session`, one session's id, or `null` for all. */
  scope: string | null
}

/** The club's sessions (any status), for linking expenses and labelling them. */
export async function loadClubSessionLabels(db: Db, clubId: string): Promise<Map<string, string>> {
  const { data, error } = await db.from('sessions').select('id, title, sport_id').eq('club_id', clubId)
  dbFail(error)
  return new Map((data ?? []).map((r) => [r.id, sessionLabel(r)]))
}

const toExpense = (r: Tables<'club_expenses'>, billers: Map<string, string>, sessions: Map<string, string>): ExpenseView => ({
  id: r.id,
  description: r.description,
  amount: r.amount,
  currency: r.currency as CurrencyCode,
  spentOn: r.spent_on,
  billerId: r.biller_id,
  sessionId: r.session_id,
  notes: r.notes,
  scope: r.session_id ? 'session' : 'global',
  billerName: r.biller_id ? (billers.get(r.biller_id) ?? null) : null,
  sessionLabel: r.session_id ? (sessions.get(r.session_id) ?? null) : null,
})

/**
 * The club's expenses matching the filter: one page, newest first, starting at
 * `offset`, and every match's amount and currency (for totals and the count).
 */
export async function listExpenses(db: Db, clubId: string, filter: ExpenseFilter, offset: number, size: number): Promise<{ expenses: ExpenseView[]; all: { amount: number; currency: CurrencyCode }[] }> {
  const filtered = <Q extends { eq: (c: string, v: string) => Q; gte: (c: string, v: string) => Q; lte: (c: string, v: string) => Q; is: (c: string, v: null) => Q; not: (c: string, o: string, v: null) => Q }>(query: Q): Q => {
    let q = query.eq('club_id', clubId)
    if (filter.from) q = q.gte('spent_on', filter.from)
    if (filter.to) q = q.lte('spent_on', filter.to)
    if (filter.billerId) q = q.eq('biller_id', filter.billerId)
    if (filter.scope === 'global') q = q.is('session_id', null)
    else if (filter.scope === 'session') q = q.not('session_id', 'is', null)
    else if (filter.scope) q = q.eq('session_id', filter.scope)
    return q
  }
  const [page, amounts, billers, sessions] = await Promise.all([
    filtered(db.from('club_expenses').select('*')).order('spent_on', { ascending: false }).order('created_at', { ascending: false }).range(offset, offset + size - 1),
    filtered(db.from('club_expenses').select('amount, currency')).limit(accountingLimits.maxExpenses),
    db.from('club_billers').select('id, name').eq('club_id', clubId),
    loadClubSessionLabels(db, clubId),
  ])
  dbFail(page.error ?? amounts.error ?? billers.error)
  const names = new Map((billers.data ?? []).map((b) => [b.id, b.name]))
  return {
    expenses: (page.data ?? []).map((r) => toExpense(r, names, sessions)),
    all: (amounts.data ?? []).map((a) => ({ amount: a.amount, currency: a.currency as CurrencyCode })),
  }
}

/** One of the club's expenses, with its biller's name and session's label; `null` when there's no such expense. */
export async function loadExpense(db: Db, clubId: string, expenseId: string): Promise<ExpenseView | null> {
  const [row, billers, sessions] = await Promise.all([
    db.from('club_expenses').select('*').eq('club_id', clubId).eq('id', expenseId).maybeSingle(),
    db.from('club_billers').select('id, name').eq('club_id', clubId),
    loadClubSessionLabels(db, clubId),
  ])
  dbFail(row.error ?? billers.error)
  return row.data ? toExpense(row.data, new Map((billers.data ?? []).map((b) => [b.id, b.name])), sessions) : null
}

export async function countExpenses(db: Db, clubId: string): Promise<number> {
  const { count, error } = await db.from('club_expenses').select('id', { count: 'exact', head: true }).eq('club_id', clubId)
  dbFail(error)
  return count ?? 0
}

const expenseColumns = (e: ExpenseInput) => ({
  description: e.description,
  amount: e.amount,
  currency: e.currency,
  spent_on: e.spentOn,
  biller_id: e.billerId,
  session_id: e.sessionId,
  notes: e.notes,
})

export async function createExpense(db: Db, clubId: string, id: string, expense: ExpenseInput): Promise<void> {
  const { error } = await db.from('club_expenses').insert({ id, club_id: clubId, ...expenseColumns(expense) })
  dbFail(error)
}

/** `false` when the club has no such expense. */
export async function updateExpense(db: Db, clubId: string, id: string, expense: ExpenseInput): Promise<boolean> {
  const { data, error } = await db.from('club_expenses').update(expenseColumns(expense)).eq('club_id', clubId).eq('id', id).select('id')
  dbFail(error)
  return Boolean(data?.length)
}

export async function deleteExpense(db: Db, clubId: string, id: string): Promise<boolean> {
  const { data, error } = await db.from('club_expenses').delete().eq('club_id', clubId).eq('id', id).select('id')
  dbFail(error)
  return Boolean(data?.length)
}

// The dashboard's ledger

/**
 * Everything the dashboard counts: the club's finished sessions, their
 * invoices, its manual invoices (`manual`, loaded by `loadManualLedger`), and its expenses and billers. Date ranges are applied by
 * `accountingSummary`, in the viewer's time zone.
 */
export async function loadLedger(db: Db, clubId: string, withInvoices: boolean, manual: Ledger['invoices']): Promise<Ledger> {
  const [sessions, expenses, billers] = await Promise.all([
    db.from('sessions').select('id, title, sport_id, ended_at, updated_at').eq('club_id', clubId).eq('status', 'ended'),
    db.from('club_expenses').select('amount, currency, spent_on, session_id, biller_id').eq('club_id', clubId),
    db.from('club_billers').select('id, name').eq('club_id', clubId),
  ])
  dbFail(sessions.error ?? expenses.error ?? billers.error)
  const ids = (sessions.data ?? []).map((s) => s.id)
  let invoices: Ledger['invoices'] = []
  if (withInvoices && ids.length) {
    const rows = await db.from('session_invoices').select('session_id, amount, currency, payments').in('session_id', ids)
    dbFail(rows.error)
    invoices = (rows.data ?? []).map((i) => ({ sessionId: i.session_id, amount: i.amount, currency: i.currency as CurrencyCode, payments: storedPayments(i.payments) }))
  }
  return {
    sessions: (sessions.data ?? []).map((s) => ({ id: s.id, label: sessionLabel(s), endedAt: s.ended_at ?? s.updated_at })),
    invoices: [...invoices, ...manual],
    expenses: (expenses.data ?? []).map((e) => ({ amount: e.amount, currency: e.currency as CurrencyCode, spentOn: e.spent_on, sessionId: e.session_id, billerId: e.biller_id })),
    billers: billers.data ?? [],
  }
}
