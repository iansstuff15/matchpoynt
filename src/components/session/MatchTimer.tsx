import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatElapsed } from '@/utils/time/formatElapsed'

interface MatchTimerProps {
  /** ISO start time from the server. */
  startedAt: string
  now: number
}

/** Elapsed time of the match on a court. */
export default function MatchTimer({ startedAt, now }: MatchTimerProps) {
  const elapsed = Math.max(0, now - Date.parse(startedAt))
  return (
    <Badge variant="outline" className="tabular-nums" title="Time since this match started">
      <Clock aria-hidden />
      <time dateTime={`PT${Math.floor(elapsed / 1000)}S`}>{formatElapsed(elapsed)}</time>
      <span className="sr-only">elapsed</span>
    </Badge>
  )
}
