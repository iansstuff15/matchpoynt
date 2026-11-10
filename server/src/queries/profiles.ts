import type { AccountRole, ProfileInput, ProfileView, SportId } from '@matchpoynt/shared'
import type { Db } from '@/utils/supabase/client'
import { dbFail } from '@/utils/supabase/errors'

const emptyProfile: ProfileView = {
  firstName: null,
  lastName: null,
  displayName: null,
  phone: null,
  city: null,
  role: null,
  termsAcceptedAt: null,
  sports: [],
}

/** The caller's profile; every field empty if they haven't saved one yet. */
export async function loadProfile(db: Db, userId: string): Promise<ProfileView> {
  const [profile, sports] = await Promise.all([
    db.from('profiles').select('*').eq('id', userId).maybeSingle(),
    db.from('player_sports').select('sport_id, tier_id').eq('user_id', userId),
  ])
  dbFail(profile.error ?? sports.error)
  const row = profile.data
  return {
    ...emptyProfile,
    ...(row && {
      firstName: row.first_name,
      lastName: row.last_name,
      displayName: row.display_name,
      phone: row.phone,
      city: row.city,
      role: row.role as AccountRole | null,
      termsAcceptedAt: row.terms_accepted_at,
    }),
    sports: (sports.data ?? []).map((s) => ({ sportId: s.sport_id as SportId, tierId: s.tier_id })),
  }
}

/** Saves the profile and its sports in one transaction (save_profile). Input must already be validated. */
export async function saveProfile(db: Db, input: ProfileInput, now: Date): Promise<void> {
  const { error } = await db.rpc('save_profile', {
    p_profile: {
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      display_name: input.displayName.trim(),
      phone: input.phone?.trim() || null,
      city: input.city?.trim() || null,
      role: input.role,
      terms_accepted_at: now.toISOString(),
    },
    p_sports: input.sports.map((s) => ({ sport_id: s.sportId, tier_id: s.tierId })),
  })
  dbFail(error)
}
