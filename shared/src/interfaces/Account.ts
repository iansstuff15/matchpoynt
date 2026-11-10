import type { AccountRole, ProfileField } from '../types/account.ts'
import type { SportId } from '../types/sport.ts'

export interface PlayerSport {
  sportId: SportId
  tierId: string
}

/** Body of profile saves, and the profile part of sign-up. */
export interface ProfileInput {
  firstName: string
  lastName: string
  displayName: string
  phone: string | null
  city: string | null
  role: AccountRole
  acceptTerms: boolean
  sports: PlayerSport[]
}

export interface ProfileView {
  firstName: string | null
  lastName: string | null
  displayName: string | null
  phone: string | null
  city: string | null
  role: AccountRole | null
  termsAcceptedAt: string | null
  sports: PlayerSport[]
}

/** Where the signed-in person's profile stands. `missing` drives the complete-profile form. */
export interface ProfileStatus {
  complete: boolean
  missing: ProfileField[]
  profile: ProfileView
  /** Prefill from the sign-in provider (e.g. the name on a Google account). */
  suggested: Partial<Pick<ProfileInput, 'firstName' | 'lastName' | 'displayName'>>
}

export interface SignUpInput {
  email: string
  password: string
  profile: ProfileInput
}

export interface SignUpResponse {
  /** True when a confirmation email was sent: the account signs in once its email is confirmed. */
  confirmEmail: boolean
}

export interface PasswordSignInInput {
  email: string
  password: string
  /** Page to return to afterwards (e.g. where the sign-in expired). The API decides if it's allowed. */
  next?: string
}

export interface ForgotPasswordInput {
  email: string
}

export interface ResetPasswordInput {
  password: string
}
