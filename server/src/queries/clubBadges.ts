import type { ClubBadgeCondition, ClubBadgeIconSource, ClubBadgeInput, ClubBadgeScope, ClubBadgeView } from '@matchpoynt/shared'
import { toMatch } from '@/queries/sessions'
import type { Json, Tables } from '@/types/database'
import { badgeSummary, type ClubHistory } from '@/utils/club/badges'
import { mediaUrl } from '@/utils/club/media'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

// Club badges, and the club history career badges count, queried as the
// signed-in user (RLS: only their clubs), or through the public functions
// for published leaderboards.

type BadgeRow = Tables<'club_badges'>

/** A badge row (or its JSON from `public_leaderboard`) as the club page and leaderboards show it. */
export function toBadgeView(r: Pick<BadgeRow, 'id' | 'name' | 'description' | 'scope' | 'conditions' | 'icon_path' | 'icon_source'>): ClubBadgeView {
  const badge = { scope: r.scope as ClubBadgeScope, conditions: r.conditions as unknown as ClubBadgeCondition[] }
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    ...badge,
    iconUrl: mediaUrl(r.icon_path),
    iconSource: (r.icon_source as ClubBadgeIconSource | null) ?? null,
    summary: badgeSummary(badge),
  }
}

export async function loadBadgeRows(db: Db, clubId: string): Promise<BadgeRow[]> {
  const { data, error } = await db.from('club_badges').select('*').eq('club_id', clubId).order('created_at')
  dbFail(error)
  return data ?? []
}

export async function createBadge(db: Db, clubId: string, id: string, badge: ClubBadgeInput): Promise<void> {
  const { error } = await db
    .from('club_badges')
    .insert({ id, club_id: clubId, name: badge.name, description: badge.description, scope: badge.scope, conditions: badge.conditions as unknown as Json })
  dbFail(error)
}

/** `false` when the badge isn't one of the club's. */
export async function updateBadge(db: Db, clubId: string, id: string, badge: ClubBadgeInput): Promise<boolean> {
  const { data, error } = await db
    .from('club_badges')
    .update({ name: badge.name, description: badge.description, scope: badge.scope, conditions: badge.conditions as unknown as Json, updated_at: new Date().toISOString() })
    .eq('club_id', clubId)
    .eq('id', id)
    .select('id')
  dbFail(error)
  return Boolean(data?.length)
}

export async function setBadgeIcon(db: Db, clubId: string, id: string, path: string | null, source: ClubBadgeIconSource | null): Promise<void> {
  const { error } = await db
    .from('club_badges')
    .update({ icon_path: path, icon_source: source, updated_at: new Date().toISOString() })
    .eq('club_id', clubId)
    .eq('id', id)
  dbFail(error)
}

/** The deleted badge's icon path, or `undefined` when it wasn't one of the club's. */
export async function deleteBadge(db: Db, clubId: string, id: string): Promise<string | null | undefined> {
  const { data, error } = await db.from('club_badges').delete().eq('club_id', clubId).eq('id', id).select('icon_path')
  dbFail(error)
  return data?.[0] ? data[0].icon_path : undefined
}

/** Every session the club has run: their players and finished matches, for career badges. */
export async function loadClubHistory(db: Db, clubId: string): Promise<ClubHistory> {
  const sessions = await db.from('sessions').select('id').eq('club_id', clubId)
  dbFail(sessions.error)
  const ids = (sessions.data ?? []).map((s) => s.id)
  if (!ids.length) return { players: [], matches: [] }
  const [players, matches] = await Promise.all([
    db.from('session_players').select('id, session_id, name').in('session_id', ids),
    db.from('matches').select('*').in('session_id', ids).not('finished_at', 'is', null),
  ])
  dbFail(players.error ?? matches.error)
  return {
    players: (players.data ?? []).map((p) => ({ id: p.id, sessionId: p.session_id, name: p.name })),
    matches: (matches.data ?? []).map(toMatch),
  }
}

interface PublicHistoryRow {
  players: { id: string; session_id: string; key: string }[]
  matches: Pick<Tables<'matches'>, 'id' | 'session_id' | 'side_a' | 'side_b' | 'finished_at' | 'games' | 'winner'>[]
}

/**
 * The club history behind a published leaderboard (`public_club_history`):
 * only players named in that session, by their name key, never other names.
 */
export async function loadPublicClubHistory(db: Db, slug: string): Promise<ClubHistory> {
  const { data, error } = await db.rpc('public_club_history', { p_slug: slug })
  dbFail(error)
  if (!data) return { players: [], matches: [] }
  const row = data as unknown as PublicHistoryRow
  return {
    players: row.players.map((p) => ({ id: p.id, sessionId: p.session_id, name: p.key })),
    matches: row.matches.map((m) => toMatch({ ...m, court_id: null, court_label: '', sport_id: '', started_at: m.finished_at ?? '' } as Tables<'matches'>)),
  }
}
