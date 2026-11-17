import { useSearchParams } from 'react-router'
import RecordGamesCard from '@/components/record/RecordGamesCard'
import RecordShell from '@/components/record/RecordShell'
import type { GamesFilter } from '@/utils/hooks/useProfile'

/** Your match history (`/record/games`): every match, filtered by sport, club or session (kept in the address). */
export default function RecordGamesPage() {
  const [params, setParams] = useSearchParams()
  const filter: GamesFilter = { sport: params.get('sport') ?? undefined, club: params.get('club') ?? undefined, session: params.get('session') ?? undefined }
  const setFilter = (next: GamesFilter) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(next)) if (value) query.set(key, value)
    setParams(query, { replace: true })
  }
  return (
    <RecordShell title="Match history" description="Every match you played across your clubs, filtered by sport, club or session.">
      {(record) => <RecordGamesCard record={record} filter={filter} onFilter={setFilter} />}
    </RecordShell>
  )
}
