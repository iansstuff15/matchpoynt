import {
  accountLimits,
  accountRoles,
  sportRules,
  type ProfileField,
  type ProfileInput,
  type ProfileView,
  type SignUpStepId,
} from '@matchpoynt/shared'
import type { AuthUser } from '@/interfaces/AuthUser'
import { invalid } from '@/utils/http/errors'

type StepErrors = Partial<Record<SignUpStepId, string>>

/** Problems with a profile, keyed by the sign-up step that shows them. */
export function validateProfile(input: ProfileInput): StepErrors {
  const errors: StepErrors = {}
  const first = input.firstName.trim()
  const last = input.lastName.trim()
  const display = input.displayName.trim()

  if (!first || !last) errors.profile = 'Enter your first and last name.'
  else if (first.length > accountLimits.nameMaxLength || last.length > accountLimits.nameMaxLength) {
    errors.profile = `Names can be up to ${accountLimits.nameMaxLength} characters.`
  } else if (display.length < accountLimits.displayNameMinLength || display.length > accountLimits.displayNameMaxLength) {
    errors.profile = `Your display name must be ${accountLimits.displayNameMinLength} to ${accountLimits.displayNameMaxLength} characters. It's what others see on boards.`
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
  if (!profile.displayName) missing.push('displayName')
  if (!profile.role) missing.push('role')
  if (!profile.termsAcceptedAt) missing.push('terms')
  if (profile.sports.length === 0) missing.push('sports')
  return missing
}

/** Name details from the sign-in provider (Google's name on the token), to prefill the complete-profile form. */
export function suggestedFromUser(user: Pick<AuthUser, 'name'>): Pick<ProfileInput, 'firstName' | 'lastName' | 'displayName'> | Record<string, never> {
  const full = (user.name ?? '').trim().replace(/\s+/g, ' ')
  const first = full.split(' ')[0] ?? ''
  const last = full.split(' ').slice(1).join(' ')
  if (!first && !last) return {}
  return { firstName: first, lastName: last, displayName: first.slice(0, accountLimits.displayNameMaxLength) }
}
