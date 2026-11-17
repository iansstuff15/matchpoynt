import type { CurrencyCode } from '../types/fee.ts'
import type { ExpenseScope } from '../types/accounting.ts'

/** Body of adding or editing a biller: someone the club pays (a venue, a shuttle supplier, a coach…). */
export interface BillerInput {
  name: string
  contact: string | null
  notes: string | null
}

export interface BillerView extends BillerInput {
  id: string
  /** How many of the club's expenses are linked to them. */
  expenses: number
}

export interface BillersResponse {
  billers: BillerView[]
}

/** Body of adding or editing an expense. Amounts are minor units, as fees are. */
export interface ExpenseInput {
  description: string
  amount: number
  currency: CurrencyCode
  /** The day it was spent, YYYY-MM-DD. */
  spentOn: string
  /** Who was paid: one of the club's billers, or `null`. */
  billerId: string | null
  /** The club session it was for, or `null` for a club-wide (global) expense. */
  sessionId: string | null
  notes: string | null
}

export interface ExpenseView extends ExpenseInput {
  id: string
  scope: ExpenseScope
  billerName: string | null
  /** The session's title or "<Sport> session"; `null` for a global expense. */
  sessionLabel: string | null
}

/** One total per currency, in minor units. */
export interface MoneyTotal {
  currency: CurrencyCode
  amount: number
}

/** One expense, for its own page (`GET /api/accounting/:clubId/expenses/:expenseId`). */
export interface ExpenseResponse {
  expense: ExpenseView
}

/** The club's expenses for a date range, newest first (`GET /api/accounting/:clubId/expenses`). */
export interface ExpensesResponse {
  expenses: ExpenseView[]
  /** Totals of every expense matching the filters, not just this page. */
  totals: MoneyTotal[]
  /** How many expenses match the filters. */
  count: number
  /** Pass as `offset` for the next page; `null` at the end. */
  nextOffset: number | null
}

/** Income and spending, in minor units of one currency. `net` is what was collected less what was spent. */
export interface AccountingFigures {
  invoiced: number
  collected: number
  outstanding: number
  expenses: number
  net: number
}

export interface AccountingMonthView extends AccountingFigures {
  /** YYYY-MM. */
  month: string
  /** e.g. "Nov 2026". */
  label: string
}

/** One club session's takings and costs. */
export interface AccountingSessionView extends AccountingFigures {
  sessionId: string
  label: string
  endedAt: string
}

/** Spending with one biller (`null` for expenses with none). */
export interface AccountingBillerView {
  billerId: string | null
  name: string
  expenses: number
  count: number
}

/** Everything in one currency. Clubs usually have just one. */
export interface AccountingCurrencyView {
  currency: CurrencyCode
  totals: AccountingFigures
  /** Every month in the range, oldest first, empty months included. */
  months: AccountingMonthView[]
  /** Club sessions in the range that charged a fee or had expenses, newest first. */
  sessions: AccountingSessionView[]
  /** Club-wide expenses, not tied to a session. */
  globalExpenses: number
  /** Biggest spend first. */
  billers: AccountingBillerView[]
}

/** The club's accounting dashboard (`GET /api/accounting/:clubId/summary`). */
export interface AccountingView {
  /** The range it covers, YYYY-MM-DD, inclusive; `null` for open-ended. */
  from: string | null
  to: string | null
  /** The time zone months and days were counted in. */
  timeZone: string
  currencies: AccountingCurrencyView[]
}
