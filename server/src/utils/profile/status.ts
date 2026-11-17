import type { CurrentUser, ProfileStatus } from '@matchpoynt/shared'
import type { AuthUser } from '@/interfaces/AuthUser'
import { loadProfile, loadProfileExtras } from '@/queries/profiles'
import { profileMediaUrl } from '@/utils/club/media'
import { manageClubsBlockedReason, missingFields, runSessionsBlockedReason, suggestedFromUser } from '@/utils/profile/rules'
import type { Db } from '@/utils/supabase/client'

export async function profileStatus(db: Db, user: AuthUser): Promise<ProfileStatus> {
  const profile = await loadProfile(db, user.id)
  const missing = missingFields(profile)
  return { complete: missing.length === 0, missing, profile, suggested: suggestedFromUser(user) }
}

/** The signed-in person as the web app sees them. Guests (anonymous) need no profile. */
export async function currentUser(db: Db, user: AuthUser): Promise<CurrentUser> {
  if (user.isAnonymous) return { id: user.id, email: null, displayName: null, username: null, avatarUrl: null, profileComplete: true, missing: [], role: null, canManageClubs: true, canRunSessions: true }
  const [status, extras] = await Promise.all([profileStatus(db, user), loadProfileExtras(db, user.id)])
  return {
    id: user.id,
    email: user.email,
    displayName: status.profile.displayName,
    username: status.profile.username,
    avatarUrl: profileMediaUrl(extras.avatarPath),
    profileComplete: status.complete,
    missing: status.missing,
    role: status.profile.role,
    canManageClubs: manageClubsBlockedReason(status.profile.role, false) === null,
    canRunSessions: runSessionsBlockedReason(status.profile.role, false) === null,
  }
}
