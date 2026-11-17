import { accountingLimits, feeCurrencies, feeLimits, type BillerInput, type ExpenseInput } from '@matchpoynt/shared'
import { invalid } from '@/utils/http/errors'

// Club accounting rules: what a biller, an expense and a date range must look
// like. Pure functions; the routes do the I/O.

type Errors<K extends string> = Partial<Record<K, string>>

function assertNone(errors: Record<string, string | undefined>) {
  const first = Object.values(errors).find(Boolean)
  if (first) throw invalid(first, errors as Record<string, string>)
}

const blankToNull = (v: string | null) => (v?.trim() ? v.trim() : null)

/** Checks a biller: a name, and optional contact details and notes. */
export function validateBiller(input: BillerInput): Errors<'name' | 'contact' | 'notes'> {
  const errors: Errors<'name' | 'contact' | 'notes'> = {}
  const name = input.name.trim()
  if (!name) errors.name = 'Give the biller a name.'
  else if (name.length > accountingLimits.billerNameMaxLength) errors.name = `Biller names can be up to ${accountingLimits.billerNameMaxLength} characters.`
  if ((input.contact?.trim().length ?? 0) > accountingLimits.contactMaxLength) errors.contact = `Contact details can be up to ${accountingLimits.contactMaxLength} characters.`
  if ((input.notes?.trim().length ?? 0) > accountingLimits.notesMaxLength) errors.notes = `Notes can be up to ${accountingLimits.notesMaxLength} characters.`
  return errors
}

/** A checked biller, tidied, refusing a name another of the club's billers already has. */
export function cleanBiller(input: BillerInput, others: { name: string }[]): BillerInput {
  const errors = validateBiller(input)
  const name = input.name.trim().replace(/\s+/g, ' ')
  if (!errors.name && others.some((b) => b.name.toLowerCase() === name.toLowerCase())) errors.name = `There's already a biller called ${name}.`
  assertNone(errors)
  return { name, contact: blankToNull(input.contact), notes: blankToNull(input.notes) }
}

export function addBillerBlockedReason(count: number): string | null {
  return count >= accountingLimits.maxBillers ? `A club can list up to ${accountingLimits.maxBillers} billers. Delete one to make room.` : null
}

export function addExpenseBlockedReason(count: number): string | null {
  return count >= accountingLimits.maxExpenses ? `A club can keep up to ${accountingLimits.maxExpenses.toLocaleString('en')} expenses. Delete old ones to make room.` : null
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/

/** Whether `value` is a real calendar day written YYYY-MM-DD. */
export function isDay(value: string): boolean {
  if (!isoDate.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

type ExpenseField = 'description' | 'amount' | 'spentOn' | 'billerId' | 'sessionId' | 'notes' | 'currency'

/**
 * Checks an expense against the club: a description, an amount above zero, a
 * real day, and a biller and session that are the club's own.
 */
export function cleanExpense(input: ExpenseInput, club: { billerIds: Set<string>; sessionIds: Set<string> }): ExpenseInput {
  const errors: Errors<ExpenseField> = {}
  const description = input.description.trim()
  if (!description) errors.description = 'Say what the expense was for.'
  else if (description.length > accountingLimits.descriptionMaxLength) errors.description = `Descriptions can be up to ${accountingLimits.descriptionMaxLength} characters.`
  if (!Number.isInteger(input.amount) || input.amount <= 0) errors.amount = 'Enter the amount spent, like 150 or 150.50.'
  else if (input.amount > feeLimits.maxAmount * 10) errors.amount = `An expense can be up to ${((feeLimits.maxAmount * 10) / feeLimits.minorPerUnit).toLocaleString('en')}.`
  if (!(input.currency in feeCurrencies)) errors.currency = 'Pick a currency from the list.'
  if (!isDay(input.spentOn)) errors.spentOn = 'Pick the day it was spent.'
  if (input.billerId !== null && !club.billerIds.has(input.billerId)) errors.billerId = "That biller isn't one of this club's any more. Pick another, or none."
  if (input.sessionId !== null && !club.sessionIds.has(input.sessionId)) errors.sessionId = "That session isn't one of this club's. Pick one of its sessions, or the whole club."
  if ((input.notes?.trim().length ?? 0) > accountingLimits.notesMaxLength) errors.notes = `Notes can be up to ${accountingLimits.notesMaxLength} characters.`
  assertNone(errors)
  return { ...input, description, notes: blankToNull(input.notes) }
}

/** A time zone the API can count days in (an IANA name like "Asia/Manila"); UTC when none is given. */
export function cleanTimeZone(timeZone: string | undefined): string {
  if (!timeZone) return 'UTC'
  try {
    new Intl.DateTimeFormat('en', { timeZone })
    return timeZone
  } catch {
    throw invalid(`"${timeZone}" isn't a time zone Matchpoynt knows. Reload the page.`, { tz: 'Unknown time zone' })
  }
}

const monthsBetween = (from: string, to: string) => (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7)) + 1

/** A date range, inclusive: either end may be open (`null`). Refuses unreal days, a backwards range and one wider than the dashboard can show. */
export function cleanRange(from: string | undefined, to: string | undefined): { from: string | null; to: string | null } {
  if (from !== undefined && !isDay(from)) throw invalid('The start date is not a real day. Pick it again.', { from: 'Not a date' })
  if (to !== undefined && !isDay(to)) throw invalid('The end date is not a real day. Pick it again.', { to: 'Not a date' })
  if (from && to && from > to) throw invalid('The start date is after the end date. Swap them, or pick again.', { from: 'After the end' })
  if (from && to && monthsBetween(from, to) > accountingLimits.maxMonths) {
    throw invalid(`Pick a range of up to ${accountingLimits.maxMonths / 12} years.`, { from: 'Too wide' })
  }
  return { from: from ?? null, to: to ?? null }
}
