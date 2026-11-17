import type { PlayerLiveMe } from '@matchpoynt/shared'
import { CalendarClock } from 'lucide-react'
import { formatStartsIn } from '@/utils/time/formatStartsIn'

interface PlayerNextMatchProps {
  next: NonNullable<PlayerLiveMe['nextMatch']>
  /** When the API expects it to start; `null` when it can't say. */
  startsAt: string | null
  /** The page's clock, already set to the API's time. */
  now: number
}

/** Their next match up front: "You & Cy vs Ben & Dee", and roughly when it starts. */
export default function PlayerNextMatch({ next, startsAt, now }: PlayerNextMatchProps) {
  const ours = ['You', ...next.partners].join(' & ')
  return (
    <div className="play-next-match" role="group" aria-label="Your next match">
      <CalendarClock className="size-5 shrink-0 text-primary" aria-hidden />
      <div className="grid min-w-0 gap-0.5">
        <p className="truncate font-medium">
          Next: {ours} <span className="text-muted-foreground">vs</span> {next.opponents.join(' & ')}
        </p>
        {startsAt && <p className="text-sm text-muted-foreground">Starts {formatStartsIn(Date.parse(startsAt) - now)} (an estimate from how long this session's matches take)</p>}
      </div>
    </div>
  )
}
