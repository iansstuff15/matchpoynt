import type { FeeScheme } from '../interfaces/Fee.ts'
import type { CurrencyCode, FeeKind } from '../types/fee.ts'

/** The ways a joining fee can be charged, as the fee forms list them. */
export const feeKinds: Record<FeeKind, { label: string; description: string }> = {
  fixed: { label: 'Fixed', description: 'Everyone pays the same amount, however many games they play.' },
  'per-game': { label: 'Per game', description: 'Players pay for each game they play.' },
  'base-per-game': { label: 'Base price + per game', description: 'A starting price, plus an amount for each game played.' },
}

/** Currencies fees can be charged in. Every one has 2 decimal places: amounts are stored in hundredths. */
export const feeCurrencies: Record<CurrencyCode, { label: string }> = {
  PHP: { label: 'Philippine peso' },
  USD: { label: 'US dollar' },
  EUR: { label: 'Euro' },
  GBP: { label: 'British pound' },
  AUD: { label: 'Australian dollar' },
  CAD: { label: 'Canadian dollar' },
  NZD: { label: 'New Zealand dollar' },
  SGD: { label: 'Singapore dollar' },
  MYR: { label: 'Malaysian ringgit' },
  HKD: { label: 'Hong Kong dollar' },
  INR: { label: 'Indian rupee' },
}

/** Limits the fee forms show and the API enforces. Amounts are in minor units. */
export const feeLimits = {
  /** Minor units per whole unit of every listed currency. */
  minorPerUnit: 100,
  /** The largest single amount (base price or per-game price): 100,000.00. */
  maxAmount: 10_000_000,
}

/** Where a new fee scheme starts in the forms. */
export const feeDefaults: FeeScheme = { kind: 'fixed', currency: 'PHP', base: 0, perGame: 0 }

