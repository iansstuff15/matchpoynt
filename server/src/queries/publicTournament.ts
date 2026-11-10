import type { SportId } from '@matchpoynt/shared'
import type { TournamentState } from '@/interfaces/TournamentState'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

interface PublicRow {
  sport_id: string
  status: 'active' | 'ended'
  updated_at: string
  tournament: TournamentState
  players: { id: string; name: string }[]
}

/** A published tournament with its players' names, or `null` if the slug isn't published. */
export async function loadPublicTournament(db: Db, slug: string) {
  const { data, error } = await db.rpc('public_tournament', { p_slug: slug })
  dbFail(error)
  if (!data) return null
  const row = data as unknown as PublicRow
  return {
    sportId: row.sport_id as SportId,
    status: row.status,
    updatedAt: row.updated_at,
    tournament: row.tournament,
    names: new Map(row.players.map((p) => [p.id, p.name])),
  }
}
