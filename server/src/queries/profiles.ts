import { sportRules, type AccountLookupResponse, type AccountRole, type GameScore, type MatchSide, type PhotoPosition, type ProfileClubView, type ProfileInput, type ProfileView, type SocialLink, type SportId } from '@matchpoynt/shared'
import { toBadgeView } from '@/queries/clubBadges'
import { toMatch } from '@/queries/sessions'
import type { Tables } from '@/types/database'
import type { MemberHistory } from '@/utils/profile/history'
import type { Json } from '@/types/database'
import { positionOf } from '@/utils/club/appearance'
import { mediaUrl, profileMediaUrl } from '@/utils/club/media'
import { anonSupabase } from '@/utils/supabase/anon'
import { normalizeHandle } from '@/utils/social/handles'
import { socialLinksOf } from '@/utils/social/links'
import type { Db } from '@/utils/supabase/client'
import { dbFail } from '@/utils/supabase/errors'

const emptyProfile: ProfileView = {
  firstName: null,
  lastName: null,
  displayName: null,
  username: null,
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
      // The display name is the username (older profiles keep theirs until they pick one).
      displayName: row.username ?? row.display_name,
      username: row.username,
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
      username: normalizeHandle(input.username),
      phone: input.phone?.trim() || null,
      city: input.city?.trim() || null,
      role: input.role,
      terms_accepted_at: now.toISOString(),
    },
    p_sports: input.sports.map((s) => ({ sport_id: s.sportId, tier_id: s.tierId })),
  })
  dbFail(error)
}

/** What the profile page adds to the profile: the photo, links and when it was made. Empty for someone with no profile row yet. */
export async function loadProfileExtras(db: Db, userId: string): Promise<{ avatarPath: string | null; avatarPosition: PhotoPosition; socialLinks: SocialLink[]; createdAt: string | null }> {
  const { data, error } = await db.from('profiles').select('avatar_path, avatar_position, social_links, created_at').eq('id', userId).maybeSingle()
  dbFail(error)
  return {
    avatarPath: data?.avatar_path ?? null,
    avatarPosition: positionOf(data?.avatar_position ?? null),
    socialLinks: socialLinksOf(data?.social_links),
    createdAt: data?.created_at ?? null,
  }
}

/**
 * Sets parts of the caller's profile row that the profile form doesn't (photo,
 * its position, links), making the row if they haven't completed a profile yet
 * (a Google photo arrives before the profile does).
 */
export async function updateProfileExtras(db: Db, userId: string, change: { avatar_path?: string | null; avatar_position?: PhotoPosition | null; social_links?: SocialLink[] }): Promise<void> {
  const row = { id: userId, ...change, avatar_position: change.avatar_position as unknown as Json, social_links: change.social_links as unknown as Json, updated_at: new Date().toISOString() }
  for (const key of ['avatar_position', 'social_links'] as const) if (!(key in change)) delete row[key]
  const { error } = await db.from('profiles').upsert(row, { onConflict: 'id' })
  dbFail(error)
}

/** Whether another account already uses this username (username_taken: every account, not just the caller's). */
export async function usernameTaken(db: Db, username: string, userId: string | null): Promise<boolean> {
  const { data, error } = await db.rpc('username_taken', { p_username: username, p_user_id: userId })
  dbFail(error)
  return Boolean(data)
}

/** The signed-in person's username, for finding them on a leaderboard; `null` for guests and profiles without one. */
export async function viewerUsername(db: Db, user: { id: string; isAnonymous: boolean } | null): Promise<string | null> {
  if (!user || user.isAnonymous) return null
  const { data, error } = await db.from('profiles').select('username').eq('id', user.id).maybeSingle()
  dbFail(error)
  return data?.username ?? null
}

/** The account behind a username (account_for_username, readable signed out), for signing in with it; `null` when nobody has it. */
export async function accountIdByUsername(username: string): Promise<string | null> {
  const { data, error } = await anonSupabase().rpc('account_for_username', { p_username: username })
  dbFail(error)
  return (data as string | null) ?? null
}

/** A person's username, display name and photo by account id (profile_card, readable signed out), for the sign-in form. */
export async function loadProfileCard(userId: string): Promise<NonNullable<AccountLookupResponse['account']>> {
  const { data, error } = await anonSupabase().rpc('profile_card', { p_user_id: userId })
  dbFail(error)
  const card = (data as { username: string | null; display_name: string | null; avatar_path: string | null; avatar_position: unknown } | null) ?? null
  return {
    username: card?.username ?? null,
    displayName: card?.display_name ?? null,
    avatarUrl: profileMediaUrl(card?.avatar_path ?? null),
    avatarPosition: positionOf(card?.avatar_position ?? null),
  }
}

interface HistoryRow {
  id: string
  name: string
  handle: string | null
  avatar_path: string | null
  avatar_position: unknown
  member_name: string
  badges: Parameters<typeof toBadgeView>[0][]
  sessions: { id: string; title: string | null; sport_id: string; ended_at: string }[]
  players: { id: string; session_id: string; name: string }[]
  matches: { id: string; session_id: string; court_label: string; side_a: string[]; side_b: string[]; started_at: string; finished_at: string; games: GameScore[]; winner: MatchSide | null }[]
}

/**
 * The clubs the caller has joined (by accepting an invite), with the sessions,
 * players, finished matches and badges the profile page counts
 * (my_club_history, which reads only those clubs).
 */
export async function loadMemberHistories(db: Db): Promise<{ clubs: ProfileClubView[]; histories: MemberHistory[] }> {
  const { data, error } = await db.rpc('my_club_history')
  dbFail(error)
  const rows = (data as unknown as HistoryRow[] | null) ?? []
  const sessionLabel = (s: HistoryRow['sessions'][number]) => s.title ?? `${sportRules[s.sport_id as SportId]?.name ?? 'Court'} session`
  return {
    clubs: rows.map((r) => ({ id: r.id, name: r.name, handle: r.handle, avatarUrl: mediaUrl(r.avatar_path), avatarPosition: positionOf(r.avatar_position), memberName: r.member_name })),
    histories: rows.map((r) => ({
      clubId: r.id,
      clubName: r.name,
      memberName: r.member_name,
      badges: r.badges.map(toBadgeView),
      sessions: r.sessions.map((s) => ({ id: s.id, label: sessionLabel(s), sportId: s.sport_id as SportId, endedAt: s.ended_at })),
      players: r.players.map((p) => ({ id: p.id, sessionId: p.session_id, name: p.name })),
      matches: r.matches.map((m) => ({ ...toMatch({ ...m, court_id: null, sport_id: '' } as unknown as Tables<'matches'>), sessionId: m.session_id })),
    })),
  }
}
