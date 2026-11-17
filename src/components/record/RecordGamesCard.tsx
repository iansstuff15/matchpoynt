import type { ProfileRecordView } from '@matchpoynt/shared'
import { History, Plus, X } from 'lucide-react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import GameRow from '@/components/profile/GameRow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { sports } from '@/config/sports'
import { useProfileGames, type GamesFilter } from '@/utils/hooks/useProfile'

const all = 'all'

interface RecordGamesCardProps {
  record: ProfileRecordView
  filter: GamesFilter
  onFilter: (filter: GamesFilter) => void
}

/** Every match they played, newest first, a page at a time, narrowed to one sport, club or session. */
export default function RecordGamesCard({ record, filter, onFilter }: RecordGamesCardProps) {
  const games = useProfileGames(true, filter)
  const list = games.data?.pages.flatMap((p) => p.games) ?? []
  const session = filter.session ? record.sessions.find((s) => s.sessionId === filter.session) : null
  const filtered = Boolean(filter.sport || filter.club || filter.session)

  return (
    <Card aria-labelledby="record-games-title">
      <CardHeader>
        <CardTitle className="font-display">
          <h2 id="record-games-title" className="flex items-center gap-2">
            <History className="size-5" aria-hidden />
            Match history
          </h2>
        </CardTitle>
        <CardDescription>Every match you played across your clubs, newest first.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="record-sport">Sport</Label>
            <Select value={filter.sport ?? all} onValueChange={(v) => onFilter({ ...filter, sport: v === all ? undefined : v, session: undefined })}>
              <SelectTrigger id="record-sport" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={all}>All sports</SelectItem>
                {record.bySport.map((s) => (
                  <SelectItem key={s.sportId} value={s.sportId}>
                    {sports[s.sportId].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="record-club">Club</Label>
            <Select value={filter.club ?? all} onValueChange={(v) => onFilter({ ...filter, club: v === all ? undefined : v, session: undefined })}>
              <SelectTrigger id="record-club" className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={all}>All clubs</SelectItem>
                {record.byClub.map((c) => (
                  <SelectItem key={c.clubId} value={c.clubId}>
                    {c.clubName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filtered && (
            <Button variant="ghost" onClick={() => onFilter({})}>
              <X />
              Show all games
            </Button>
          )}
        </div>
        {session && (
          <p className="text-sm text-muted-foreground" role="status">
            Only {session.sessionLabel} at {session.clubName}.
          </p>
        )}
        {games.isError ? (
          <ErrorBanner error={games.error} action="load your games" onRetry={() => void games.refetch()} />
        ) : games.isPending ? (
          <ul className="grid gap-2" aria-busy="true" aria-label="Loading your games">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-16 w-full" />
              </li>
            ))}
          </ul>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">{filtered ? 'No games match these filters.' : 'No games yet. Play in your clubs’ sessions to build your history.'}</p>
        ) : (
          <ul className="grid gap-2" aria-label="Your games">
            {list.map((g) => (
              <GameRow key={g.matchId} game={g} />
            ))}
          </ul>
        )}
        {games.hasNextPage && (
          <Button variant="outline" className="mx-auto" disabled={games.isFetchingNextPage} onClick={() => void games.fetchNextPage()}>
            <Plus />
            Show older games
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
