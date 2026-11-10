import type { ClubSessionView } from '@matchpoynt/shared'
import { LayoutGrid, Trophy } from 'lucide-react'
import { Link } from 'react-router'
import CoverCard from '@/components/club/CoverCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { sports } from '@/config/sports'
import { formatWhen } from '@/utils/time/formatWhen'

/** A session the club ran (or is running), with its cover photo as the background. Opens the board or the session's results. */
export default function ClubSessionCard({ session }: { session: ClubSessionView }) {
  const sport = sports[session.sportId]
  const SportIcon = sport.icon
  const running = session.status === 'active'
  const title = session.title ?? `${sport.name} session`

  return (
    <CoverCard coverUrl={session.coverUrl} className="h-full gap-4" aria-labelledby={`club-session-${session.id}`}>
      <CardHeader>
        <CardDescription className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <SportIcon className="size-4" aria-hidden />
            {sport.name}
          </span>
          <Badge variant={running ? 'default' : 'secondary'}>{running ? 'Running' : 'Finished'}</Badge>
        </CardDescription>
        <CardTitle id={`club-session-${session.id}`} className="line-clamp-2 font-display text-lg" title={title}>
          {title}
        </CardTitle>
        <CardDescription>
          <time dateTime={session.startedAt}>{formatWhen(session.startedAt)}</time>
          {session.endedAt && (
            <>
              {' to '}
              <time dateTime={session.endedAt}>{formatWhen(session.endedAt)}</time>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto">
        <Button asChild variant="secondary" className="w-full">
          {running ? (
            <Link to="/app">
              <LayoutGrid />
              Open the board
            </Link>
          ) : (
            <Link to={`/app/${session.id}`}>
              <Trophy />
              See results
            </Link>
          )}
        </Button>
      </CardFooter>
    </CoverCard>
  )
}
