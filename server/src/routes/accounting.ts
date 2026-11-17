import type { AccountingView, BillersResponse, ClubInvoicesResponse, ExpenseResponse, ExpensesResponse, InvoiceGroupResponse } from '@matchpoynt/shared'
import { Hono, type Context } from 'hono'
import { features } from '@/config/features'
import { countExpenses, createBiller, createExpense, deleteBiller, deleteExpense, listExpenses, loadExpense, loadBillers, loadClubSessionLabels, loadLedger, updateBiller, updateExpense } from '@/queries/accounting'
import { countManualInvoices, createManualInvoice, deleteManualInvoice, listManualInvoices, loadManualLedger, loadPayer, savePayerPayments } from '@/queries/clubInvoices'
import { markedPaid, withPayment, withoutPayment, type PaymentRecord } from '@/utils/fees/payments'
import { loadClubRow, loadMembers } from '@/queries/clubs'
import { loadClubSessionGroups } from '@/queries/invoices'
import { addInvoiceBlockedReason, cleanManualInvoice, manualGroup } from '@/utils/accounting/invoices'
import { addBillerBlockedReason, addExpenseBlockedReason, cleanBiller, cleanExpense, cleanRange, cleanTimeZone } from '@/utils/accounting/rules'
import { accountingSummary, dayIn, moneyTotals } from '@/utils/accounting/summary'
import { conflict, invalid, notFound } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { body, requireClubManager, requireCompleteProfile, requireUser, resolveUser } from '@/utils/http/middleware'
import type { AppEnv } from '@/utils/http/types'
import { accountingQuery, billerSchema, expenseQuery, expenseSchema, invoicePaidSchema, invoicePaymentSchema, manualInvoiceSchema, pageOffset, uuidParam } from '@/utils/validation/schemas'
import { pageSizes } from '@matchpoynt/shared'

function idParam(c: Context, name: string): string {
  const parsed = uuidParam.safeParse(c.req.param(name))
  if (!parsed.success) throw notFound('Not found.')
  return parsed.data
}

/** The caller's club (RLS hides everyone else's), or 404. */
async function ownClub(c: Context<AppEnv>) {
  const row = await loadClubRow(c.get('db'), idParam(c, 'clubId'))
  if (!row) throw notFound('Club not found. The link may be wrong, or the club belongs to another account.')
  return row
}

const ownClubId = async (c: Context<AppEnv>) => (await ownClub(c)).id

const invoiceNotFound = () => notFound('That invoice no longer exists. It may have been deleted on another device.')

/** One manual invoice, as the invoice pages show it, or 404. */
async function manualInvoice(c: Context<AppEnv>, club: { id: string; name: string }, invoiceId: string) {
  const record = (await listManualInvoices(c.get('db'), club.id, club.name, null, null)).find((r) => r.id === invoiceId)
  if (!record) throw invoiceNotFound()
  return manualGroup(record)
}

const billerNotFound = () => notFound('That biller no longer exists. It may have been deleted on another device.')
const expenseNotFound = () => notFound('That expense no longer exists. It may have been deleted on another device.')

const billersOf = async (c: Context<AppEnv>, clubId: string) => c.json({ billers: await loadBillers(c.get('db'), clubId) } satisfies BillersResponse)

/** What an expense may link to: the club's own billers and sessions. */
async function expenseLinks(c: Context<AppEnv>, clubId: string) {
  const [billers, sessions] = await Promise.all([loadBillers(c.get('db'), clubId), loadClubSessionLabels(c.get('db'), clubId)])
  return { billerIds: new Set(billers.map((b) => b.id)), sessionIds: new Set(sessions.keys()) }
}

/**
 * Club accounting: billers the club pays, its expenses (club-wide or for one
 * of its sessions), and a dashboard combining them with its session invoices.
 * Owners only; RLS checks every row.
 */
export const accountingRoutes = new Hono<AppEnv>()
  .use(requireFeature('web', 'clubs'))
  .use(requireFeature('web', 'accounting'))
  .use(resolveUser)
  .use(requireUser)
  .use(requireCompleteProfile)
  .use(requireClubManager)

  // Billers
  .get('/:clubId/billers', async (c) => billersOf(c, await ownClubId(c)))
  .post('/:clubId/billers', async (c) => {
    const clubId = await ownClubId(c)
    const existing = await loadBillers(c.get('db'), clubId)
    const blocked = addBillerBlockedReason(existing.length)
    if (blocked) throw conflict(blocked)
    await createBiller(c.get('db'), clubId, crypto.randomUUID(), cleanBiller(await body(c, billerSchema), existing))
    return billersOf(c, clubId)
  })
  .put('/:clubId/billers/:billerId', async (c) => {
    const clubId = await ownClubId(c)
    const billerId = idParam(c, 'billerId')
    const others = (await loadBillers(c.get('db'), clubId)).filter((b) => b.id !== billerId)
    if (!(await updateBiller(c.get('db'), clubId, billerId, cleanBiller(await body(c, billerSchema), others)))) throw billerNotFound()
    return billersOf(c, clubId)
  })
  // Their expenses stay, with no biller.
  .delete('/:clubId/billers/:billerId', async (c) => {
    const clubId = await ownClubId(c)
    if (!(await deleteBiller(c.get('db'), clubId, idParam(c, 'billerId')))) throw billerNotFound()
    return billersOf(c, clubId)
  })

  // Expenses
  .get('/:clubId/expenses', async (c) => {
    const clubId = await ownClubId(c)
    const parsed = expenseQuery.safeParse(c.req.query())
    if (!parsed.success) throw invalid('The expense filters are not valid. Reset them and try again.', { filter: 'Not valid' })
    const { from, to } = cleanRange(parsed.data.from, parsed.data.to)
    const offset = pageOffset.safeParse(c.req.query('offset')).data ?? 0
    const { expenses, all } = await listExpenses(c.get('db'), clubId, { from, to, billerId: parsed.data.biller ?? null, scope: parsed.data.scope ?? null }, offset, pageSizes.expenses)
    const response: ExpensesResponse = { expenses, totals: moneyTotals(all), count: all.length, nextOffset: offset + expenses.length < all.length ? offset + expenses.length : null }
    return c.json(response)
  })
  // One expense, for its own page.
  .get('/:clubId/expenses/:expenseId', async (c) => {
    const clubId = await ownClubId(c)
    const expense = await loadExpense(c.get('db'), clubId, idParam(c, 'expenseId'))
    if (!expense) throw expenseNotFound()
    const response: ExpenseResponse = { expense }
    return c.json(response)
  })
  .post('/:clubId/expenses', async (c) => {
    const clubId = await ownClubId(c)
    const blocked = addExpenseBlockedReason(await countExpenses(c.get('db'), clubId))
    if (blocked) throw conflict(blocked)
    const expense = cleanExpense(await body(c, expenseSchema), await expenseLinks(c, clubId))
    await createExpense(c.get('db'), clubId, crypto.randomUUID(), expense)
    return c.body(null, 204)
  })
  .put('/:clubId/expenses/:expenseId', async (c) => {
    const clubId = await ownClubId(c)
    const expense = cleanExpense(await body(c, expenseSchema), await expenseLinks(c, clubId))
    if (!(await updateExpense(c.get('db'), clubId, idParam(c, 'expenseId'), expense))) throw expenseNotFound()
    return c.body(null, 204)
  })
  .delete('/:clubId/expenses/:expenseId', async (c) => {
    const clubId = await ownClubId(c)
    if (!(await deleteExpense(c.get('db'), clubId, idParam(c, 'expenseId')))) throw expenseNotFound()
    return c.body(null, 204)
  })

  // The dashboard: invoices (while fees are on) and expenses, by month, session and biller.
  .get('/:clubId/summary', async (c) => {
    const clubId = await ownClubId(c)
    const parsed = accountingQuery.safeParse(c.req.query())
    if (!parsed.success) throw invalid('The dashboard dates are not valid. Reset them and try again.', { filter: 'Not valid' })
    const range = cleanRange(parsed.data.from, parsed.data.to)
    const timeZone = cleanTimeZone(parsed.data.tz)
    const ledger = await loadLedger(c.get('db'), clubId, features().web.fees, await loadManualLedger(c.get('db'), clubId))
    const response: AccountingView = accountingSummary(ledger, range, timeZone, dayIn(new Date().toISOString(), timeZone))
    return c.json(response)
  })

  // Invoices: the club's manual ones, and its sessions' (while fees are on), for a period, newest first.
  .get('/:clubId/invoices', async (c) => {
    const club = await ownClub(c)
    const parsed = accountingQuery.safeParse(c.req.query())
    if (!parsed.success) throw invalid('The invoice dates are not valid. Reset them and try again.', { filter: 'Not valid' })
    const range = cleanRange(parsed.data.from, parsed.data.to)
    const timeZone = cleanTimeZone(parsed.data.tz)
    const db = c.get('db')
    const [manual, sessions] = await Promise.all([
      listManualInvoices(db, club.id, club.name, range.from, range.to),
      features().web.fees ? loadClubSessionGroups(db, club.id) : [],
    ])
    const sessionDay = (iso: string) => dayIn(iso, timeZone)
    const inRange = (day: string) => (!range.from || day >= range.from) && (!range.to || day <= range.to)
    const groups = [...manual.map(manualGroup), ...sessions.filter((g) => inRange(sessionDay(g.date)))]
    // Newest first: manual invoices by their day, sessions by the day they ended.
    const dayOf = (g: (typeof groups)[number]) => (g.kind === 'manual' ? g.date : sessionDay(g.date))
    groups.sort((a, b) => dayOf(b).localeCompare(dayOf(a)) || b.date.localeCompare(a.date))
    const offset = pageOffset.safeParse(c.req.query('offset')).data ?? 0
    const page = groups.slice(offset, offset + pageSizes.clubInvoices)
    const response: ClubInvoicesResponse = { groups: page, nextOffset: offset + page.length < groups.length ? offset + page.length : null }
    return c.json(response)
  })
  .post('/:clubId/invoices', async (c) => {
    const club = await ownClub(c)
    const db = c.get('db')
    const blocked = addInvoiceBlockedReason(await countManualInvoices(db, club.id))
    if (blocked) throw conflict(blocked)
    const { invoice, payers } = cleanManualInvoice(await body(c, manualInvoiceSchema), await loadMembers(db, club.id), () => crypto.randomUUID())
    await createManualInvoice(db, club.id, crypto.randomUUID(), invoice, payers)
    return c.body(null, 204)
  })
  // One manual invoice, for its own page.
  .get('/:clubId/invoices/:invoiceId', async (c) => {
    const club = await ownClub(c)
    const response: InvoiceGroupResponse = { group: await manualInvoice(c, club, idParam(c, 'invoiceId')) }
    return c.json(response)
  })
  .delete('/:clubId/invoices/:invoiceId', async (c) => {
    const clubId = await ownClubId(c)
    if (!(await deleteManualInvoice(c.get('db'), clubId, idParam(c, 'invoiceId')))) throw invoiceNotFound()
    return c.body(null, 204)
  })
  // A payer paid in full (what's left, by `method`) or unpaid; answers with the invoice and its new totals.
  .put('/:clubId/invoices/:invoiceId/payers/:payerId', async (c) => {
    const { paid, method } = await body(c, invoicePaidSchema)
    return changePayerPayments(c, (payer) => markedPaid(payer.amount, payer.payments, paid, method ?? 'cash', crypto.randomUUID(), new Date()))
  })
  // A payment towards what a payer owes: part of it, or the rest.
  .post('/:clubId/invoices/:invoiceId/payers/:payerId/payments', async (c) => {
    const input = await body(c, invoicePaymentSchema)
    return changePayerPayments(c, (payer) => withPayment(payer.amount, payer.payments, input, payer.currency, crypto.randomUUID(), new Date()))
  })
  .delete('/:clubId/invoices/:invoiceId/payers/:payerId/payments/:paymentId', async (c) => {
    const paymentId = idParam(c, 'paymentId')
    return changePayerPayments(c, (payer) => withoutPayment(payer.amount, payer.payments, paymentId))
  })

/** Loads one payer of one of the club's manual invoices, applies the change to their payments, saves, and answers with the invoice. */
async function changePayerPayments(c: Context<AppEnv>, change: (payer: NonNullable<Awaited<ReturnType<typeof loadPayer>>>) => PaymentRecord) {
  const club = await ownClub(c)
  const invoiceId = idParam(c, 'invoiceId')
  const payerId = idParam(c, 'payerId')
  const payer = await loadPayer(c.get('db'), club.id, invoiceId, payerId)
  if (!payer) throw notFound('That payer is no longer on the invoice. It may have been deleted on another device.')
  await savePayerPayments(c.get('db'), invoiceId, payerId, change(payer))
  const response: InvoiceGroupResponse = { group: await manualInvoice(c, club, invoiceId) }
  return c.json(response)
}
