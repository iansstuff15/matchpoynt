/**
 * How a session's joining fee is charged:
 * `fixed`: everyone pays the same flat amount;
 * `per-game`: an amount for every game they play;
 * `base-per-game`: a starting price, plus an amount for every game they play.
 */
export type FeeKind = 'fixed' | 'per-game' | 'base-per-game'

/** ISO 4217 code of a currency fees can be charged in (`feeCurrencies`). */
export type CurrencyCode = 'PHP' | 'USD' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'NZD' | 'SGD' | 'MYR' | 'HKD' | 'INR'

/** Session invoices (from a session's fee) or a manual invoice (made by the club). */
export type InvoiceGroupKind = 'session' | 'manual'

/** A manual invoice's amount: what each payer owes, or a total shared evenly between them. */
export type InvoiceSplit = 'each' | 'total'

/** How a payment was made: in cash at the venue, or online (a transfer, an e-wallet, a payment QR). */
export type PaymentMethod = 'cash' | 'online'

/** Where an invoice stands: paid in full, paid in part (e.g. a downpayment), or not paid yet. */
export type PaymentStatus = 'paid' | 'partial' | 'unpaid'
