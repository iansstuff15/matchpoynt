import type { CurrencyCode, FeeKind, InvoiceGroupKind, InvoiceSplit, PaymentMethod, PaymentStatus } from '../types/fee.ts'
import type { SportId } from '../types/sport.ts'

/**
 * A joining fee. Amounts are whole minor units of the currency (cents,
 * centavos…), so totals never pick up rounding errors.
 */
export interface FeeScheme {
  kind: FeeKind
  currency: CurrencyCode
  /** `fixed`: the flat fee. `base-per-game`: the starting price. The API saves 0 for `per-game`. */
  base: number
  /** `per-game` and `base-per-game`: added for every game played. The API saves 0 for `fixed`. */
  perGame: number
  /**
   * What players may pay first, e.g. when they sign up, before the rest; 0 (or
   * left out) for none. The host records it like any payment, as a part of
   * what each player owes.
   */
  downpayment?: number
}

/** One payment towards an invoice: part of it (e.g. a downpayment) or the rest. */
export interface InvoicePayment {
  id: string
  /** Minor units of the invoice's currency. */
  amount: number
  /** Cash or online; `null` for payments recorded before the method was asked. */
  method: PaymentMethod | null
  /** ISO time it was recorded. */
  paidAt: string
}

/** Body of recording a payment towards an invoice. */
export interface InvoicePaymentInput {
  amount: number
  method: PaymentMethod
}

/** Body of saving a club's fee scheme; `null` for no fee. */
export interface ClubFeeInput {
  fee: FeeScheme | null
}

/** What one person owes: a player for a finished session, or a payer on a manual invoice. */
export interface InvoiceView {
  id: string
  /** The session player (session invoices) or club member (manual ones, when picked from the roster); `null` for a name typed in. */
  playerId: string | null
  name: string
  /** Games they played in the session; `null` on a manual invoice. */
  games: number | null
  /** In minor units of the group's currency. */
  amount: number
  /** How the amount was worked out, written by the API, e.g. "₱100.00 + 4 games × ₱50.00" or "Share of ₱2,000.00". */
  breakdown: string
  /** When it was paid in full, ISO; `null` until then. */
  paidAt: string | null
  /** Every payment towards it, oldest first. */
  payments: InvoicePayment[]
  /** Paid so far, and what's left, in minor units. */
  paidAmount: number
  balance: number
  status: PaymentStatus
}

/** A session's invoices, or a manual invoice and its payers, with totals worked out by the API. */
export interface InvoiceGroupView {
  /** The session's id, or the manual invoice's. */
  id: string
  kind: InvoiceGroupKind
  /** Set for session invoices. */
  sessionId: string | null
  /** The session's title (or "<Sport> session"), or what the manual invoice is for. */
  label: string
  /** The session's sport; `null` for a manual invoice. */
  sportId: SportId | null
  /** The club that ran the session or issued the invoice; `null` for sessions started from the board (or while clubs are off). */
  clubId: string | null
  clubName: string | null
  /** When the session ended (ISO time), or the day a manual invoice was issued (YYYY-MM-DD). */
  date: string
  currency: CurrencyCode
  /** What's owed, in words: "Fee: ₱100.00, plus ₱50.00 per game", "₱500.00 each", "₱2,000.00 split between 4". */
  summary: string
  /** A manual invoice's notes. */
  notes: string | null
  /** One per person who owes something, by name. */
  invoices: InvoiceView[]
  /** The downpayment the fee asks for, in minor units; `null` without one. */
  downpayment: number | null
  /** Minor units. */
  total: number
  paid: number
  outstanding: number
  /** People who have paid in full, and those who've paid part. */
  paidCount: number
  partialCount: number
}

/** Body of creating a manual invoice: what it's for, how much, and who pays. */
export interface ManualInvoiceInput {
  title: string
  notes: string | null
  currency: CurrencyCode
  /** YYYY-MM-DD. */
  issuedOn: string
  /** In minor units: what each payer owes (`each`), or the total shared between them (`total`). */
  amount: number
  split: InvoiceSplit
  /** Club members (by id) or anyone else (by name). */
  payers: { memberId: string | null; name: string }[]
}

/** A club's invoices for a period: manual ones and its sessions', newest first (`GET /api/accounting/:clubId/invoices`). */
export interface ClubInvoicesResponse {
  groups: InvoiceGroupView[]
  /** Pass as `offset` for the next page; `null` at the end. */
  nextOffset: number | null
}

/** One finished session's invoices (`GET /api/invoices/:sessionId`); `null` when it had no fee. */
export interface InvoiceGroupResponse {
  group: InvoiceGroupView | null
}


/** Body of marking an invoice paid in full (recording what's left, paid by `method`) or unpaid (clearing its payments). */
export interface InvoicePaidInput {
  paid: boolean
  /** How the rest was paid; cash when left out. */
  method?: PaymentMethod
}
