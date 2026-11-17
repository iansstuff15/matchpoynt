import type { SportId } from '@matchpoynt/shared'
import type { MatchState, PlayerState } from '@/interfaces/SessionState'
import type { Tables } from '@/types/database'
import { toBadgeView } from '@/queries/clubBadges'
import { toMatch } from '@/queries/sessions'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

interface PublicRow {
  sport_id: string
  status: 'active' | 'ended'
  updated_at: string
  players: { id: string; name: string; tier_id: string; active: boolean }[]
  matches: Omit<Tables<'matches'>, 'session_id' | 'sport_id' | 'court_id'>[]
  /** The badges of the club that runs the session (added in 0016). */
  club_badges?: Pick<Tables<'club_badges'>, 'id' | 'name' | 'description' | 'scope' | 'conditions' | 'icon_path' | 'icon_source'>[]
}

/** Results of a published session, or `null` if the slug isn't published. */
export async function loadPublicResults(db: Db, slug: string) {
  const { data, error } = await db.rpc('public_leaderboard', { p_slug: slug })
  dbFail(error)
  if (!data) return null

  const row = data as unknown as PublicRow
  const players = row.players.map(
    (p): PlayerState => ({
      id: p.id,
      name: p.name,
      tierId: p.tier_id,
      active: p.active,
      gamesPlayed: 0,
      rotation: 0,
      queuedAt: 0,
      status: 'waiting',
      checkedInAt: null,
    }),
  )
  const matches: MatchState[] = row.matches.map((m) => toMatch({ ...m, session_id: '', sport_id: row.sport_id, court_id: null }))
  return { sportId: row.sport_id as SportId, status: row.status, updatedAt: row.updated_at, players, matches, clubBadges: (row.club_badges ?? []).map(toBadgeView) }
}

/** The club that runs a published session (public_session_club): its name and photo path; `null` without one. */
export async function loadPublicSessionClub(db: Db, slug: string): Promise<{ name: string; avatarPath: string | null } | null> {
  const { data, error } = await db.rpc('public_session_club', { p_slug: slug })
  dbFail(error)
  const r = data as unknown as { name: string; avatar_path: string | null } | null
  return r && { name: r.name, avatarPath: r.avatar_path }
}
