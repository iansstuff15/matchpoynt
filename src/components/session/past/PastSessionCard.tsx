import type { EndedSessionView } from '@matchpoynt/shared'
import { Trophy } from 'lucide-react'
import { Link } from 'react-router'
import CoverCard from '@/components/club/CoverCard'
import DeleteSessionButton from '@/components/session/DeleteSessionButton'
import { Button } from '@/components/ui/button'
import { CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { sports } from '@/config/sports'
import { formatWhen } from '@/utils/time/formatWhen'

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** A finished session on the session board: when it ran and how big it was. Opens its page with the final leaderboard, or deletes it. */
interface PastSessionCardProps {
  session: EndedSessionView
  deleting: boolean
  onDelete: () => void
}

export default function PastSessionCard({ session, deleting, onDelete }: PastSessionCardProps) {
  const sport = sports[session.sportId]
  const SportIcon = sport.icon
  const title = session.title ?? `${sport.name} session`

  return (
    <CoverCard coverUrl={session.coverUrl} className="h-full gap-4" aria-labelledby={`past-session-${session.id}`}>
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <SportIcon className="size-4" aria-hidden />
          {sport.name}
        </CardDescription>
        <CardTitle id={`past-session-${session.id}`} className="line-clamp-2 font-display text-lg" title={title}>
          {title}
        </CardTitle>
        <CardDescription>
          <time dateTime={session.startedAt}>{formatWhen(session.startedAt)}</time>
          {' to '}
          <time dateTime={session.endedAt}>{formatWhen(session.endedAt)}</time>
        </CardDescription>
        <CardDescription>
          {count(session.matchesFinished, 'match', 'matches')} · {count(session.players, 'player')}
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto gap-2">
        <DeleteSessionButton iconOnly label={title} pending={deleting} onConfirm={onDelete} />
        <Button asChild variant="secondary" className="flex-1">
          <Link to={`/app/${session.id}`} aria-label={`See the leaderboard of ${title}, ${formatWhen(session.endedAt)}`}>
            <Trophy />
            See leaderboard
          </Link>
        </Button>
      </CardFooter>
    </CoverCard>
  )
}
