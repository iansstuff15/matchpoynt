import { feeCurrencies, feeLimits, type CurrencyCode, type FeeScheme } from '@matchpoynt/shared'
import { invalid } from '@/utils/http/errors'

// Joining fees: what a valid fee scheme looks like, what a player owes under
// one, and the fee in words. Pure functions; the routes do the I/O.

/** An amount in the currency's own format, e.g. "₱1,250.00". */
export function formatMoney(minor: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(minor / feeLimits.minorPerUnit)
}

const amountProblem = (amount: number, what: string): string | null => {
  if (!Number.isInteger(amount) || amount < 0) return `${what} must be an amount of money, like 150 or 150.50.`
  if (amount > feeLimits.maxAmount) return `${what} can be up to ${(feeLimits.maxAmount / feeLimits.minorPerUnit).toLocaleString('en')}.`
  return null
}

/** What's wrong with a fee scheme, in the user's words, or `null` when it's fine. `null` (no fee) is always fine. */
export function validateFee(fee: FeeScheme | null): string | null {
  if (!fee) return null
  if (!(fee.currency in feeCurrencies)) return 'Pick a currency from the list.'
  const down = fee.downpayment ?? 0
  const downProblem = amountProblem(down, 'The downpayment')
  if (downProblem) return downProblem
  // Less than the whole fee: it's the part paid first. Per-game fees grow with play, so only a fixed fee caps it.
  if (down > 0 && fee.kind === 'fixed' && down >= fee.base) return 'Make the downpayment less than the fee, or leave it at 0.'
  if (down > 0 && fee.kind === 'base-per-game' && down > fee.base) return 'Make the downpayment no more than the base price.'
  const base = amountProblem(fee.base, fee.kind === 'fixed' ? 'The fee' : 'The base price')
  const perGame = amountProblem(fee.perGame, 'The price per game')
  switch (fee.kind) {
    case 'fixed':
      return base ?? (fee.base === 0 ? 'Set the fee, or pick "No fee".' : null)
    case 'per-game':
      return perGame ?? (fee.perGame === 0 ? 'Set the price per game, or pick "No fee".' : null)
    case 'base-per-game':
      if (base ?? perGame) return base ?? perGame
      if (fee.base === 0) return 'Set the base price, or pick "Per game".'
      return fee.perGame === 0 ? 'Set the price per game, or pick "Fixed".' : null
    default:
      return 'Pick how the fee is charged.'
  }
}

/** A fee scheme as it's saved: the amount its kind doesn't use set to 0. */
export function keptFee(fee: FeeScheme | null): FeeScheme | null {
  if (!fee) return null
  return {
    kind: fee.kind,
    currency: fee.currency,
    base: fee.kind === 'per-game' ? 0 : fee.base,
    perGame: fee.kind === 'fixed' ? 0 : fee.perGame,
    ...(fee.downpayment ? { downpayment: fee.downpayment } : {}),
  }
}

/** A checked fee scheme, as it's saved. Throws `invalid` keyed by `field`. */
export function cleanFee(fee: FeeScheme | null, field = 'fee'): FeeScheme | null {
  const problem = validateFee(fee)
  if (problem) throw invalid(problem, { [field]: problem })
  return keptFee(fee)
}

/** What a player who played `games` games owes, in minor units. */
export function amountFor(fee: FeeScheme, games: number): number {
  switch (fee.kind) {
    case 'fixed':
      return fee.base
    case 'per-game':
      return fee.perGame * games
    case 'base-per-game':
      return fee.base + fee.perGame * games
  }
}

/** The fee in words, e.g. "₱150.00 per player", "₱50.00 per game", "₱100.00, plus ₱50.00 per game". */
export function feeSummary(fee: FeeScheme): string {
  const money = (minor: number) => formatMoney(minor, fee.currency)
  switch (fee.kind) {
    case 'fixed':
      return `${money(fee.base)} per player`
    case 'per-game':
      return `${money(fee.perGame)} per game`
    case 'base-per-game':
      return `${money(fee.base)}, plus ${money(fee.perGame)} per game`
  }
}

/** The downpayment in words, e.g. "₱50.00 down", or `null` without one. */
export function downpaymentText(fee: FeeScheme): string | null {
  return fee.downpayment ? `${formatMoney(fee.downpayment, fee.currency)} down` : null
}

const gamesText = (games: number) => `${games} ${games === 1 ? 'game' : 'games'}`

/** How one invoice's amount was worked out, e.g. "₱100.00 + 4 games × ₱50.00". */
export function invoiceBreakdown(fee: FeeScheme, games: number): string {
  const money = (minor: number) => formatMoney(minor, fee.currency)
  switch (fee.kind) {
    case 'fixed':
      return `Fixed fee (${gamesText(games)} played)`
    case 'per-game':
      return `${gamesText(games)} × ${money(fee.perGame)}`
    case 'base-per-game':
      return `${money(fee.base)} + ${gamesText(games)} × ${money(fee.perGame)}`
  }
}
