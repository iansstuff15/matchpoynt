import {
  accountLimits,
  accountRoles,
  type AccountRole,
  sportRules,
  type ProfileField,
  type ProfileInput,
  type ProfileView,
  type SignUpStepId,
} from '@matchpoynt/shared'
import type { AuthUser } from '@/interfaces/AuthUser'
import { ApiError, invalid } from '@/utils/http/errors'
import { handleProblem, normalizeHandle, suggestHandle } from '@/utils/social/handles'

type StepErrors = Partial<Record<SignUpStepId, string>>

/** Problems with a profile, keyed by the sign-up step that shows them. */
export function validateProfile(input: ProfileInput): StepErrors {
  const errors: StepErrors = {}
  const first = input.firstName.trim()
  const last = input.lastName.trim()

  if (!first || !last) errors.profile = 'Enter your first and last name.'
  else if (first.length > accountLimits.nameMaxLength || last.length > accountLimits.nameMaxLength) {
    errors.profile = `Names can be up to ${accountLimits.nameMaxLength} characters.`
  } else if (handleProblem(input.username, 'username')) {
    errors.profile = handleProblem(input.username, 'username')!
  } else if ((input.phone ?? '').trim().length > accountLimits.phoneMaxLength) {
    errors.profile = `Phone numbers can be up to ${accountLimits.phoneMaxLength} characters.`
  } else if ((input.phone ?? '').trim() && !/^[+\d][\d\s().-]{5,}$/.test((input.phone ?? '').trim())) {
    errors.profile = 'That phone number has characters a phone number can\'t have.'
  } else if ((input.city ?? '').trim().length > accountLimits.cityMaxLength) {
    errors.profile = `City can be up to ${accountLimits.cityMaxLength} characters.`
  }

  const ids = input.sports.map((s) => s.sportId)
  if (input.sports.length === 0) errors.sports = 'Pick at least one sport you play.'
  else if (new Set(ids).size !== ids.length) errors.sports = 'Each sport can only be picked once.'
  else {
    const bad = input.sports.find((s) => !sportRules[s.sportId]?.tiers.some((t) => t.id === s.tierId))
    if (bad) errors.sports = `Choose your ${sportRules[bad.sportId]?.name.toLowerCase() ?? 'sport'} skill tier.`
  }

  if (!accountRoles.includes(input.role)) errors.agreements = 'Choose how you will use Matchpoynt.'
  else if (!input.acceptTerms) errors.agreements = 'Accept the terms of use to continue.'

  return errors
}

/** Password rules, checked before Supabase applies its own. */
export function passwordProblem(password: string): string | null {
  if (password.length < accountLimits.passwordMinLength) return `Use at least ${accountLimits.passwordMinLength} characters.`
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use at least one letter and one number.'
  return null
}

export function assertValidProfile(input: ProfileInput, extra: StepErrors = {}) {
  const errors = { ...extra, ...validateProfile(input) }
  const first = Object.values(errors)[0]
  if (first) throw invalid(first, errors)
}

/** Required fields still empty. An empty list means the profile is complete. */
export function missingFields(profile: ProfileView): ProfileField[] {
  const missing: ProfileField[] = []
  if (!profile.firstName) missing.push('firstName')
  if (!profile.lastName) missing.push('lastName')
  if (!profile.username) missing.push('username')
  if (!profile.role) missing.push('role')
  if (!profile.termsAcceptedAt) missing.push('terms')
  if (profile.sports.length === 0) missing.push('sports')
  return missing
}

/** Name details from the sign-in provider (Google's name on the token), to prefill the complete-profile form. */
export function suggestedFromUser(user: Pick<AuthUser, 'name'>): Pick<ProfileInput, 'firstName' | 'lastName' | 'username'> | Record<string, never> {
  const full = (user.name ?? '').trim().replace(/\s+/g, ' ')
  const first = full.split(' ')[0] ?? ''
  const last = full.split(' ').slice(1).join(' ')
  if (!first && !last) return {}
  return { firstName: first, lastName: last, username: suggestHandle(full) }
}

/**
 * Why this account can't run clubs, or `null` when it can. People who signed
 * up only to play don't create or manage clubs; they join them. Guests (sign-in
 * off) run the board and their clubs; a profile without a role yet is sent to
 * finish it first, so it isn't refused here.
 */
export function manageClubsBlockedReason(role: AccountRole | null, isAnonymous: boolean): string | null {
  if (isAnonymous || role !== 'player') return null
  return 'Player accounts join clubs but don\'t run them. To create or manage a club, choose "Queue Master" or "Both" under Your profile > Settings > Details.'
}

/**
 * Why this account can't run sessions (the session board, its history and
 * invoices), or `null` when it can. Player-only accounts follow sessions from
 * Playing now instead. Guests run the board; unfinished profiles are sent to
 * finish it first.
 */
export function runSessionsBlockedReason(role: AccountRole | null, isAnonymous: boolean): string | null {
  if (isAnonymous || role !== 'player') return null
  return 'Player accounts follow sessions from Playing now but don\'t run them. To run the session board, choose "Queue Master" or "Both" under Your profile > Settings > Details.'
}

export const usernameTakenMessage = (username: string) => `@${username} is already someone else's username. Pick another.`

/** A taken username, shown on the profile step. */
export function usernameTakenError(username: string) {
  const message = usernameTakenMessage(normalizeHandle(username))
  return new ApiError('conflict', message, { profile: message, username: 'Taken' })
}
