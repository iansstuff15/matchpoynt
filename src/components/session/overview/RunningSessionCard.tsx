import type { ActiveSessionSummary } from '@matchpoynt/shared'
import { LayoutGrid } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { sports } from '@/config/sports'
import { formatWhen } from '@/utils/time/formatWhen'

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** A session that's set up and running: its sport, when it started, its courts and players. Opens its board. */
export default function RunningSessionCard({ session }: { session: ActiveSessionSummary }) {
  const sport = sports[session.sportId]
  const SportIcon = sport.icon
  return (
    <Card className="h-full gap-4" aria-labelledby={`running-session-${session.id}`}>
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <SportIcon className="size-4" aria-hidden />
          {sport.name}
          <Badge className="ml-auto">Running</Badge>
        </CardDescription>
        <CardTitle id={`running-session-${session.id}`} className="line-clamp-2 font-display text-lg" title={session.label}>
          {session.label}
        </CardTitle>
        <CardDescription>
          Started <time dateTime={session.startedAt}>{formatWhen(session.startedAt)}</time>
        </CardDescription>
        <CardDescription>
          {count(session.players, 'player')} · {session.playing} of {count(session.courts, 'court')} playing
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto">
        <Button asChild className="flex-1">
          <Link to={`/app/${session.id}`} aria-label={`Open the board of ${session.label}`}>
            <LayoutGrid />
            Open board
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
