import { accountingLimits, type AccountingBillerView, type AccountingCurrencyView, type AccountingFigures, type AccountingMonthView, type AccountingSessionView, type AccountingView, type CurrencyCode, type MoneyTotal } from '@matchpoynt/shared'

// The club's accounting dashboard, worked out from its session invoices and
// its expenses. Pure; the queries load the rows. Cash basis: what was
// collected (each payment, a downpayment or the rest, on the day it was
// recorded) less what was spent (by the day it was spent). Invoiced and
// still-owed amounts count on the day the session ended.

export interface LedgerSession {
  id: string
  label: string
  endedAt: string
}

/** What one person owes: on a finished session (`sessionId`), or on a manual invoice issued on `day` (YYYY-MM-DD). */
export interface LedgerInvoice {
  sessionId: string | null
  day?: string
  amount: number
  currency: CurrencyCode
  /** Payments towards it (a downpayment and the rest, or all at once), each on its own day. */
  payments: { amount: number; paidAt: string }[]
}

export interface LedgerExpense {
  amount: number
  currency: CurrencyCode
  /** YYYY-MM-DD. */
  spentOn: string
  sessionId: string | null
  billerId: string | null
}

export interface Ledger {
  sessions: LedgerSession[]
  invoices: LedgerInvoice[]
  expenses: LedgerExpense[]
  billers: { id: string; name: string }[]
}

export interface Range {
  from: string | null
  to: string | null
}

/** The calendar day of a moment in `timeZone`, YYYY-MM-DD. */
export function dayIn(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

const inRange = (day: string, { from, to }: Range) => (!from || day >= from) && (!to || day <= to)

const zero = (): AccountingFigures => ({ invoiced: 0, collected: 0, outstanding: 0, expenses: 0, net: 0 })
const withNet = (f: AccountingFigures): AccountingFigures => ({ ...f, net: f.collected - f.expenses })

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`))

const nextMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

/** Every month from `first` to `last`, inclusive; at most the dashboard's limit, keeping the latest. */
function monthSpan(first: string, last: string): string[] {
  const months: string[] = []
  for (let m = first; m <= last; m = nextMonth(m)) months.push(m)
  return months.slice(-accountingLimits.maxMonths)
}

/** Totals per currency, biggest first. */
export function moneyTotals(items: { amount: number; currency: CurrencyCode }[]): MoneyTotal[] {
  const totals = new Map<CurrencyCode, number>()
  for (const i of items) totals.set(i.currency, (totals.get(i.currency) ?? 0) + i.amount)
  return [...totals].map(([currency, amount]) => ({ currency, amount })).sort((a, b) => b.amount - a.amount)
}

/**
 * The dashboard for a date range, counted in `timeZone`: totals, every month
 * (empty ones too), each session's takings and costs, and spending by
 * biller, separately for each currency the club used.
 */
export function accountingSummary(ledger: Ledger, range: Range, timeZone: string, today: string): AccountingView {
  const ended = new Map(ledger.sessions.map((s) => [s.id, { ...s, day: dayIn(s.endedAt, timeZone) }]))
  const billerNames = new Map(ledger.billers.map((b) => [b.id, b.name]))
  const currencies = [...new Set([...ledger.invoices.map((i) => i.currency), ...ledger.expenses.map((e) => e.currency)])]

  const views = currencies.flatMap((currency): AccountingCurrencyView[] => {
    const totals = zero()
    const months = new Map<string, AccountingFigures>()
    const month = (day: string) => {
      const key = day.slice(0, 7)
      if (!months.has(key)) months.set(key, zero())
      return months.get(key)!
    }
    const sessions = new Map<string, AccountingFigures>()
    const session = (id: string) => {
      if (!sessions.has(id)) sessions.set(id, zero())
      return sessions.get(id)!
    }
    const billers = new Map<string | null, { expenses: number; count: number }>()
    let globalExpenses = 0

    for (const invoice of ledger.invoices.filter((i) => i.currency === currency)) {
      // Session invoices count on the day the session ended; manual ones on the day they were issued.
      const s = invoice.sessionId ? ended.get(invoice.sessionId) : undefined
      const day = s?.day ?? invoice.day
      if (!day) continue
      if (inRange(day, range)) {
        totals.invoiced += invoice.amount
        month(day).invoiced += invoice.amount
        const own = s ? session(s.id) : zero()
        own.invoiced += invoice.amount
        const paid = Math.min(invoice.amount, invoice.payments.reduce((sum, p) => sum + p.amount, 0))
        own.collected += paid
        const left = invoice.amount - paid
        if (left > 0) {
          totals.outstanding += left
          month(day).outstanding += left
          own.outstanding += left
        }
      }
      for (const payment of invoice.payments) {
        const paidDay = dayIn(payment.paidAt, timeZone)
        if (inRange(paidDay, range)) {
          totals.collected += payment.amount
          month(paidDay).collected += payment.amount
        }
      }
    }

    for (const expense of ledger.expenses.filter((e) => e.currency === currency)) {
      if (!inRange(expense.spentOn, range)) continue
      totals.expenses += expense.amount
      month(expense.spentOn).expenses += expense.amount
      const s = expense.sessionId ? ended.get(expense.sessionId) : undefined
      if (s) session(s.id).expenses += expense.amount
      else globalExpenses += expense.amount
      const b = billers.get(expense.billerId) ?? { expenses: 0, count: 0 }
      billers.set(expense.billerId, { expenses: b.expenses + expense.amount, count: b.count + 1 })
    }

    if (!months.size && !range.from && !range.to) return []
    const keys = [...months.keys()].sort()
    const first = range.from?.slice(0, 7) ?? keys[0] ?? today.slice(0, 7)
    const last = range.to?.slice(0, 7) ?? (keys.at(-1) && keys.at(-1)! > today.slice(0, 7) ? keys.at(-1)! : today.slice(0, 7))
    const monthViews: AccountingMonthView[] = monthSpan(first, last).map((m) => ({ month: m, label: monthLabel(m), ...withNet(months.get(m) ?? zero()) }))
    const sessionViews: AccountingSessionView[] = [...sessions]
      .map(([id, figures]) => ({ sessionId: id, label: ended.get(id)!.label, endedAt: ended.get(id)!.endedAt, ...withNet(figures) }))
      .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    const billerViews: AccountingBillerView[] = [...billers]
      .map(([billerId, b]) => ({ billerId, name: billerId ? (billerNames.get(billerId) ?? 'Deleted biller') : 'No biller', ...b }))
      .sort((a, b) => b.expenses - a.expenses)
    return [{ currency, totals: withNet(totals), months: monthViews, sessions: sessionViews, globalExpenses, billers: billerViews }]
  })

  // Currencies with something in the range, the busiest first. A quiet range still shows the club's
  // main currency, with its empty months.
  const activity = (v: AccountingCurrencyView) => v.totals.invoiced + v.totals.collected + v.totals.expenses
  const active = views.filter((v) => activity(v) > 0).sort((a, b) => activity(b) - activity(a))
  return { from: range.from, to: range.to, timeZone, currencies: active.length ? active : views.slice(0, 1) }
}
