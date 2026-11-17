import type { PlayerLiveCourt } from '@matchpoynt/shared'
import { LayoutGrid } from 'lucide-react'
import MatchTimer from '@/components/session/MatchTimer'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/utils/cn'

interface PlayerCourtsCardProps {
  courts: PlayerLiveCourt[]
  now: number
}

const sideNames = (names: string[]) => (names.length ? names.join(' & ') : 'Open')

/** Every court: who's playing and for how long, or who's placed for its next match. The viewer's court stands out. */
export default function PlayerCourtsCard({ courts, now }: PlayerCourtsCardProps) {
  return (
    <Card data-play-reveal aria-labelledby="play-courts-title">
      <CardHeader>
        <CardTitle id="play-courts-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <LayoutGrid className="size-5" aria-hidden />
          On court
        </CardTitle>
        <CardDescription>Who's playing now, and for how long.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2" aria-label="Courts">
          {courts.map((court) => {
            const empty = court.sides.every((s) => s.length === 0)
            return (
              <li key={court.id} data-play-row className={cn('grid gap-1 rounded-lg border p-3', court.mine && 'play-mine')} aria-current={court.mine ? 'true' : undefined}>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {court.label}
                    {court.mine && <span className="sr-only"> (your court)</span>}
                  </span>
                  {court.status === 'playing' && court.startedAt ? <MatchTimer startedAt={court.startedAt} now={now} /> : <Badge variant="outline">{empty ? 'Free' : 'Getting ready'}</Badge>}
                </span>
                {!empty && (
                  <span className="text-sm text-muted-foreground">
                    {sideNames(court.sides[0])} <span aria-hidden>vs</span>
                    <span className="sr-only">versus</span> {sideNames(court.sides[1])}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
