import { feeLimits, type CurrencyCode } from '@matchpoynt/shared'

// Amounts arrive from the API in minor units (cents). These only format them
// for display and turn what's typed into minor units; the API checks them.

/** An amount in the currency's own format, e.g. "₱1,250.00". */
export function formatMoney(minor: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(minor / feeLimits.minorPerUnit)
}

/** Text typed in an amount field, in minor units: empty is 0, and anything that isn't a number is `NaN`, which the API names as the problem. */
export function toMinor(text: string): number {
  const typed = text.trim().replace(/,/g, '')
  if (!typed) return 0
  return /^\d*\.?\d*$/.test(typed) ? Math.round(Number(typed) * feeLimits.minorPerUnit) : Number.NaN
}

/** An amount as an amount field starts out: "150" or "150.5"; empty for 0. */
export function toAmountText(minor: number): string {
  return minor ? String(minor / feeLimits.minorPerUnit) : ''
}

/** A short amount for chart axes, e.g. "₱12K". */
export function formatMoneyShort(minor: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(minor / feeLimits.minorPerUnit)
}
