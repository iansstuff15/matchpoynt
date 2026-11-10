import type { CheckInRosterView, SportId } from '@matchpoynt/shared'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

interface RosterRow {
  sport_id: string
  status: 'active' | 'ended'
  players: { id: string; name: string; checked_in: boolean }[]
}

/** Who can check in from a QR link, or `null` if the link doesn't exist. */
export async function loadCheckInRoster(db: Db, slug: string): Promise<CheckInRosterView | null> {
  const { data, error } = await db.rpc('public_check_in_roster', { p_slug: slug })
  dbFail(error)
  if (!data) return null
  const row = data as unknown as RosterRow
  return {
    sportId: row.sport_id as SportId,
    status: row.status,
    players: row.players.map((p) => ({ id: p.id, name: p.name, checkedIn: p.checked_in })),
  }
}

export type CheckInResult = { result: 'ok'; name: string } | { result: 'not_found' | 'closed' | 'unknown_player' }

/** Records a QR check-in. The engine puts the player in the queue on its next load (settleCheckIns). */
export async function checkInBySlug(db: Db, slug: string, playerId: string): Promise<CheckInResult> {
  const { data, error } = await db.rpc('public_check_in', { p_slug: slug, p_player_id: playerId })
  dbFail(error)
  return data as unknown as CheckInResult
}
