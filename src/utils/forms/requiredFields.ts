import type { CreateClubInput, PlanStepId, ProfileInput, SessionSetupInput, SetupStepId, SignUpStepId } from '@matchpoynt/shared'
import type { CreateClubStepId } from '@/config/createClub'
import type { PlanDraft } from '@/utils/forms/planDraft'

// What a step of a multi-step form still needs before Next: only whether the
// required fields are filled in. Whether what's filled in is valid stays the
// API's call, when the form is sent.

const blank = (value: string | null | undefined) => !value?.trim()
const noAmount = (minor: number) => !Number.isFinite(minor) || minor <= 0

/** The session setup (and plan) steps. */
export function setupStepMissing(step: SetupStepId, setup: SessionSetupInput): string | null {
  switch (step) {
    case 'courts':
      if (setup.courts.length === 0) return 'Add at least one court.'
      return setup.courts.some((c) => blank(c.label)) ? 'Name every court.' : null
    case 'scoring':
      return blank(setup.scoring.formatId) ? 'Choose a scoring format.' : null
    case 'rules':
      return setup.rules.timeLimitMinutes !== null && !(setup.rules.timeLimitMinutes > 0) ? 'Enter the time limit in minutes, or turn it off.' : null
    case 'fees': {
      const fee = setup.fee
      if (!fee) return null
      if (fee.kind !== 'per-game' && noAmount(fee.base)) return fee.kind === 'fixed' ? 'Enter the fee, or pick "No fee".' : 'Enter the base price.'
      if (fee.kind !== 'fixed' && noAmount(fee.perGame)) return 'Enter the price per game.'
      return null
    }
    default:
      return null
  }
}

export function planStepMissing(step: PlanStepId, draft: PlanDraft): string | null {
  if (step === 'details') return blank(draft.title) ? 'Give the session a title.' : null
  return setupStepMissing(step, draft.setup)
}

/** The create-a-club steps; the handle must also have been checked free. */
export function createClubStepMissing(step: CreateClubStepId, club: CreateClubInput, handleFree: boolean): string | null {
  if (step !== 'details') return null
  if (blank(club.name)) return 'Name the club.'
  if (blank(club.handle)) return 'Pick a handle for the club.'
  return handleFree ? null : 'Pick a handle no other club has.'
}

/** The sign-up (and complete-profile) steps. */
export function signUpStepMissing(step: SignUpStepId, account: { email: string; password: string; confirm: string }, profile: ProfileInput): string | null {
  switch (step) {
    case 'account':
      if (blank(account.email)) return 'Enter your email address.'
      if (!account.password) return 'Choose a password.'
      return account.confirm ? null : 'Type your password again to confirm it.'
    case 'profile':
      if (blank(profile.firstName) || blank(profile.lastName)) return 'Enter your first and last name.'
      return blank(profile.username) ? 'Pick a username.' : null
    case 'sports':
      if (profile.sports.length === 0) return 'Pick at least one sport you play.'
      return profile.sports.some((s) => blank(s.tierId)) ? 'Choose your skill tier in each sport.' : null
    case 'agreements':
      return profile.acceptTerms ? null : 'Accept the terms of use to continue.'
  }
}

/** The first step (by index) that still needs something, or `null` when none does: steps after it can't be opened yet. */
export function firstIncomplete<T extends string>(steps: { id: T }[], missing: (step: T) => string | null): number | null {
  const i = steps.findIndex((s) => missing(s.id) !== null)
  return i < 0 ? null : i
}
