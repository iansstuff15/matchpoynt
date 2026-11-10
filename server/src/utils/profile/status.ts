import type { CurrentUser, ProfileStatus } from '@matchpoynt/shared'
import type { AuthUser } from '@/interfaces/AuthUser'
import { loadProfile } from '@/queries/profiles'
import { missingFields, suggestedFromUser } from '@/utils/profile/rules'
import type { Db } from '@/utils/supabase/client'

export async function profileStatus(db: Db, user: AuthUser): Promise<ProfileStatus> {
  const profile = await loadProfile(db, user.id)
  const missing = missingFields(profile)
  return { complete: missing.length === 0, missing, profile, suggested: suggestedFromUser(user) }
}

/** The signed-in person as the web app sees them. Guests (anonymous) need no profile. */
export async function currentUser(db: Db, user: AuthUser): Promise<CurrentUser> {
  if (user.isAnonymous) return { id: user.id, email: null, displayName: null, profileComplete: true, missing: [] }
  const status = await profileStatus(db, user)
  return {
    id: user.id,
    email: user.email,
    displayName: status.profile.displayName,
    profileComplete: status.complete,
    missing: status.missing,
  }
}
