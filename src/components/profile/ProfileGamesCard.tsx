import { History, ListFilter, Plus } from 'lucide-react'
import { Link } from 'react-router'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import GameRow from '@/components/profile/GameRow'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfileGames } from '@/utils/hooks/useProfile'

/** Their games, newest first, a page at a time: with whom, against whom, the score and the result. */
export default function ProfileGamesCard() {
  const games = useProfileGames()
  const list = games.data?.pages.flatMap((p) => p.games) ?? []

  return (
    <Card aria-labelledby="profile-games-title">
      <CardHeader>
        <CardTitle id="profile-games-title" className="flex items-center gap-2 font-display">
          <History className="size-5" aria-hidden />
          Games
        </CardTitle>
        <CardDescription>Every match you played in your clubs' sessions, newest first.</CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <Link to="/record/games">
              <ListFilter />
              By sport or club
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
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
          <p className="text-sm text-muted-foreground">No games yet.</p>
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
