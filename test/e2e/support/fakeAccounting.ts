import { randomUUID } from 'node:crypto'
import { pageSizes, type BillerInput, type BillerView, type ClubMemberView, type ExpenseInput, type ExpenseView, type InvoiceGroupView } from '@matchpoynt/shared'
import { addInvoiceBlockedReason, cleanManualInvoice, manualGroup, type ManualInvoiceRecord } from '@/utils/accounting/invoices'
import { addBillerBlockedReason, addExpenseBlockedReason, cleanBiller, cleanExpense, cleanRange, cleanTimeZone } from '@/utils/accounting/rules'
import { accountingSummary, dayIn, moneyTotals, type Ledger } from '@/utils/accounting/summary'
import { ApiError, conflict, invalid, notFound } from '@/utils/http/errors'
import { accountingQuery, billerSchema, expenseQuery, expenseSchema, invoicePaidSchema, invoicePaymentSchema, manualInvoiceSchema } from '@/utils/validation/schemas'
import { markedPaid, withPayment, withoutPayment, type PaymentRecord } from '@/utils/fees/payments'
import { parse, type FakeResponse } from './fakeSessions'

interface StoredBiller extends BillerInput {
  id: string
}

interface StoredExpense extends ExpenseInput {
  id: string
  createdAt: number
}

/**
 * The accounting part of the API, in memory, for UI tests: billers, expenses
 * and the dashboard, with the API's own rules (`utils/accounting/rules.ts`),
 * summary (`utils/accounting/summary.ts`) and schemas, as
 * `server/src/routes/accounting.ts` runs them. Sessions and their invoices
 * come from the fake sessions.
 */
export class FakeAccounting {
  private readonly billers = new Map<string, StoredBiller[]>()
  private readonly expenses = new Map<string, StoredExpense[]>()
  /** Whether a club exists (from the fake clubs). */
  hasClub: (clubId: string) => boolean = () => false
  private readonly invoices = new Map<string, ManualInvoiceRecord[]>()
  /** The club's sessions by id with their labels, its finished sessions with their invoices, and their invoice groups (from the fake sessions). */
  sessionsFor: (clubId: string) => { labels: Map<string, string>; ledger: Pick<Ledger, 'sessions' | 'invoices'>; groups: InvoiceGroupView[] } = () => ({
    labels: new Map(),
    ledger: { sessions: [], invoices: [] },
    groups: [],
  })
  /** The club's name and roster (from the fake clubs). */
  rosterFor: (clubId: string) => { name: string; members: ClubMemberView[] } = () => ({ name: '', members: [] })

  /** Answers `/accounting/...` (path with its query), or `null` for anything else. */
  handle(method: string, path: string, raw: string | null): FakeResponse | null {
    try {
      return this.route(method, path, raw)
    } catch (error) {
      if (error instanceof ApiError) return { status: error.status, body: error.toBody('test-request') }
      throw error
    }
  }

  private route(method: string, path: string, raw: string | null): FakeResponse | null {
    const [pathname, search = ''] = path.split('?')
    const m = /^\/accounting\/([^/]+)\/(billers|expenses|summary|invoices)(?:\/([^/]+))?(?:\/payers\/([^/]+))?(?:\/payments(?:\/([^/]+))?)?$/.exec(pathname!)
    if (!m) return null
    const [, clubId, area, itemId, payerId, paymentId] = m as unknown as [string, string, string, string | undefined, string | undefined, string | undefined]
    const toPayments = pathname!.includes('/payments')
    if (!this.hasClub(clubId)) throw notFound('Club not found. The link may be wrong, or the club belongs to another account.')
    const query = Object.fromEntries(new URLSearchParams(search))
    const billers = this.billers.get(clubId) ?? []
    const expenses = this.expenses.get(clubId) ?? []
    const billersOf = (): FakeResponse => ok({ billers: this.billerViews(clubId) })

    if (area === 'billers') {
      if (method === 'GET' && !itemId) return billersOf()
      if (method === 'POST' && !itemId) {
        const blocked = addBillerBlockedReason(billers.length)
        if (blocked) throw conflict(blocked)
        this.billers.set(clubId, [...billers, { id: randomUUID(), ...cleanBiller(parse(billerSchema, raw), billers) }])
        return billersOf()
      }
      const biller = billers.find((b) => b.id === itemId)
      if (!biller) throw notFound('That biller no longer exists. It may have been deleted on another device.')
      if (method === 'PUT') {
        Object.assign(biller, cleanBiller(parse(billerSchema, raw), billers.filter((b) => b !== biller)))
        return billersOf()
      }
      if (method === 'DELETE') {
        // Their expenses stay, with no biller, as the foreign key's `set null` does.
        this.billers.set(clubId, billers.filter((b) => b !== biller))
        for (const e of expenses) if (e.billerId === biller.id) e.billerId = null
        return billersOf()
      }
    }

    if (area === 'expenses') {
      const links = { billerIds: new Set(billers.map((b) => b.id)), sessionIds: new Set(this.sessionsFor(clubId).labels.keys()) }
      if (method === 'GET' && !itemId) {
        const parsed = expenseQuery.safeParse(query)
        if (!parsed.success) throw invalid('The expense filters are not valid. Reset them and try again.', { filter: 'Not valid' })
        const { from, to } = cleanRange(parsed.data.from, parsed.data.to)
        const { biller, scope } = parsed.data
        const list = expenses
          .filter((e) => (!from || e.spentOn >= from) && (!to || e.spentOn <= to) && (!biller || e.billerId === biller))
          .filter((e) => !scope || (scope === 'global' ? !e.sessionId : scope === 'session' ? Boolean(e.sessionId) : e.sessionId === scope))
          .sort((a, b) => b.spentOn.localeCompare(a.spentOn) || b.createdAt - a.createdAt)
          .map((e) => this.expenseView(clubId, e))
        // A page at a time; count and totals cover every match, as routes/accounting.ts answers.
        const offset = Number(query.offset ?? 0)
        const page = list.slice(offset, offset + pageSizes.expenses)
        return ok({ expenses: page, totals: moneyTotals(list), count: list.length, nextOffset: offset + page.length < list.length ? offset + page.length : null })
      }
      if (method === 'POST' && !itemId) {
        const blocked = addExpenseBlockedReason(expenses.length)
        if (blocked) throw conflict(blocked)
        this.expenses.set(clubId, [...expenses, { id: randomUUID(), createdAt: Date.now(), ...cleanExpense(parse(expenseSchema, raw), links) }])
        return { status: 204 }
      }
      const expense = expenses.find((e) => e.id === itemId)
      if (!expense) throw notFound('That expense no longer exists. It may have been deleted on another device.')
      if (method === 'GET') return ok({ expense: this.expenseView(clubId, expense) })
      if (method === 'PUT') {
        Object.assign(expense, cleanExpense(parse(expenseSchema, raw), links))
        return { status: 204 }
      }
      if (method === 'DELETE') {
        this.expenses.set(clubId, expenses.filter((e) => e !== expense))
        return { status: 204 }
      }
    }

    if (area === 'invoices') {
      const manual = this.invoices.get(clubId) ?? []
      if (method === 'GET' && !itemId) {
        const parsed = accountingQuery.safeParse(query)
        if (!parsed.success) throw invalid('The invoice dates are not valid. Reset them and try again.', { filter: 'Not valid' })
        const { from, to } = cleanRange(parsed.data.from, parsed.data.to)
        const timeZone = cleanTimeZone(parsed.data.tz)
        const inRange = (day: string) => (!from || day >= from) && (!to || day <= to)
        const dayOf = (g: InvoiceGroupView) => (g.kind === 'manual' ? g.date : dayIn(g.date, timeZone))
        const groups = [...manual.map(manualGroup), ...this.sessionsFor(clubId).groups].filter((g) => inRange(dayOf(g)))
        groups.sort((a, b) => dayOf(b).localeCompare(dayOf(a)) || b.date.localeCompare(a.date))
        const offset = Number(query.offset ?? 0)
        const page = groups.slice(offset, offset + pageSizes.clubInvoices)
        return ok({ groups: page, nextOffset: offset + page.length < groups.length ? offset + page.length : null })
      }
      if (method === 'POST' && !itemId) {
        const blocked = addInvoiceBlockedReason(manual.length)
        if (blocked) throw conflict(blocked)
        const roster = this.rosterFor(clubId)
        const { invoice, payers } = cleanManualInvoice(parse(manualInvoiceSchema, raw), roster.members, randomUUID)
        const record: ManualInvoiceRecord = {
          id: randomUUID(),
          clubId,
          clubName: roster.name,
          title: invoice.title,
          notes: invoice.notes,
          currency: invoice.currency,
          issuedOn: invoice.issuedOn,
          amount: invoice.amount,
          split: invoice.split,
          payers: payers.map((p) => ({ id: p.id, memberId: p.memberId, name: p.name, amount: p.amount, paidAt: null, payments: [] })),
        }
        this.invoices.set(clubId, [record, ...manual])
        return { status: 204 }
      }
      const record = manual.find((r) => r.id === itemId)
      if (!record) throw notFound('That invoice no longer exists. It may have been deleted on another device.')
      if (method === 'GET' && !payerId) return ok({ group: manualGroup(record) })
      if (method === 'DELETE' && !payerId) {
        this.invoices.set(clubId, manual.filter((r) => r !== record))
        return { status: 204 }
      }
      if (payerId) {
        // As routes/accounting.ts: paid in full or unpaid, a payment, or removing one (utils/fees/payments.ts).
        const payer = record.payers.find((p) => p.id === payerId)
        if (!payer) throw notFound('That payer is no longer on the invoice. It may have been deleted on another device.')
        const apply = (next: PaymentRecord) => {
          payer.payments = next.payments
          payer.paidAt = next.paidAt
          return ok({ group: manualGroup(record) })
        }
        if (method === 'PUT' && !toPayments) {
          const { paid, method: how } = parse(invoicePaidSchema, raw)
          return apply(markedPaid(payer.amount, payer.payments, paid, how ?? 'cash', randomUUID(), new Date()))
        }
        if (method === 'POST' && toPayments && !paymentId) return apply(withPayment(payer.amount, payer.payments, parse(invoicePaymentSchema, raw), record.currency, randomUUID(), new Date()))
        if (method === 'DELETE' && paymentId) return apply(withoutPayment(payer.amount, payer.payments, paymentId))
      }
    }

    if (area === 'summary' && method === 'GET') {
      const parsed = accountingQuery.safeParse(query)
      if (!parsed.success) throw invalid('The dashboard dates are not valid. Reset them and try again.', { filter: 'Not valid' })
      const range = cleanRange(parsed.data.from, parsed.data.to)
      const timeZone = cleanTimeZone(parsed.data.tz)
      const sessions = this.sessionsFor(clubId).ledger
      const manual = (this.invoices.get(clubId) ?? []).flatMap((r) => r.payers.map((p) => ({ sessionId: null, day: r.issuedOn, amount: p.amount, currency: r.currency, payments: p.payments })))
      const ledger: Ledger = {
        sessions: sessions.sessions,
        invoices: [...sessions.invoices, ...manual],
        expenses: expenses.map((e) => ({ amount: e.amount, currency: e.currency, spentOn: e.spentOn, sessionId: e.sessionId, billerId: e.billerId })),
        billers: billers.map((b) => ({ id: b.id, name: b.name })),
      }
      return ok(accountingSummary(ledger, range, timeZone, dayIn(new Date().toISOString(), timeZone)))
    }
    return null
  }

  private billerViews(clubId: string): BillerView[] {
    const expenses = this.expenses.get(clubId) ?? []
    return [...(this.billers.get(clubId) ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((b) => ({ ...b, expenses: expenses.filter((e) => e.billerId === b.id).length }))
  }

  private expenseView(clubId: string, e: StoredExpense): ExpenseView {
    const { id, description, amount, currency, spentOn, billerId, sessionId, notes } = e
    return {
      id,
      description,
      amount,
      currency,
      spentOn,
      billerId,
      sessionId,
      notes,
      scope: sessionId ? 'session' : 'global',
      billerName: (this.billers.get(clubId) ?? []).find((b) => b.id === billerId)?.name ?? null,
      sessionLabel: sessionId ? (this.sessionsFor(clubId).labels.get(sessionId) ?? null) : null,
    }
  }
}

const ok = (body: unknown): FakeResponse => ({ status: 200, body })
