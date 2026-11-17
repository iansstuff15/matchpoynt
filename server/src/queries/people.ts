import type { PersonProfileView } from '@matchpoynt/shared'
import { positionOf } from '@/utils/club/appearance'
import { mediaUrl, profileMediaUrl } from '@/utils/club/media'
import { socialLinksOf } from '@/utils/social/links'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

// Someone else's public profile, through `person_profile` (0044): only what a
// public profile shows, never names, email or phone.

interface PersonRow {
  user_id: string
  username: string
  avatar_path: string | null
  avatar_position: unknown
  city: string | null
  role: PersonProfileView['role']
  created_at: string
  social_links: unknown
  sports: { sport_id: PersonProfileView['sports'][number]['sportId']; tier_id: string }[]
  clubs: { id: string; name: string; handle: string; avatar_path: string | null; avatar_position: unknown }[]
}

/** The profile behind `username` without the viewer's part (`isMe`, `friend`), or `null` when nobody has it. Clubs are left out while `clubs` is off. */
export async function loadPersonProfile(db: Db, username: string, clubs: boolean): Promise<Omit<PersonProfileView, 'isMe' | 'friend'> | null> {
  const { data, error } = await db.rpc('person_profile', { p_username: username })
  dbFail(error)
  const row = data as unknown as PersonRow | null
  if (!row) return null
  return {
    userId: row.user_id,
    username: row.username,
    avatarUrl: profileMediaUrl(row.avatar_path),
    avatarPosition: positionOf(row.avatar_position),
    city: row.city,
    role: row.role,
    memberSince: row.created_at,
    socialLinks: socialLinksOf(row.social_links),
    sports: (row.sports ?? []).map((s) => ({ sportId: s.sport_id, tierId: s.tier_id })),
    clubs: clubs ? (row.clubs ?? []).map((k) => ({ id: k.id, name: k.name, handle: k.handle, avatarUrl: mediaUrl(k.avatar_path), avatarPosition: positionOf(k.avatar_position) })) : [],
  }
}
