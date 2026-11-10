import type { ProfileInput, ProfileStatus } from '@matchpoynt/shared'

// Starting values for the sign-up / profile form. Form state only; the API
// decides what's valid and whether the profile is complete.

export function emptyProfileDraft(): ProfileInput {
  return { firstName: '', lastName: '', displayName: '', phone: null, city: null, role: 'both', acceptTerms: false, sports: [] }
}

/** What's already saved, topped up with the sign-in provider's name where fields are empty. */
export function profileDraftFrom(status: ProfileStatus): ProfileInput {
  const { profile, suggested } = status
  return {
    firstName: profile.firstName ?? suggested.firstName ?? '',
    lastName: profile.lastName ?? suggested.lastName ?? '',
    displayName: profile.displayName ?? suggested.displayName ?? '',
    phone: profile.phone,
    city: profile.city,
    role: profile.role ?? 'both',
    acceptTerms: Boolean(profile.termsAcceptedAt),
    sports: profile.sports,
  }
}
