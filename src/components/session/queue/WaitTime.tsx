import { Hourglass } from 'lucide-react'
import { board } from '@/config/board'
import { cn } from '@/utils/cn'
import { formatElapsed } from '@/utils/time/formatElapsed'

interface WaitTimeProps {
  /** When the player started waiting for their next game (from the API). */
  waitingSince: string | null
  /** The queue panel's clock, already set to the API's time. */
  now: number
  className?: string
}

/** How long a queued player has waited for their next game, e.g. "4:12". Long waits turn to the warning colour. */
export default function WaitTime({ waitingSince, now, className }: WaitTimeProps) {
  if (!waitingSince) return null
  const waited = now - Date.parse(waitingSince)
  const long = waited >= board.longWaitMs
  return (
    <span
      className={cn('wait-time', long && 'wait-time-long', className)}
      title={long ? 'Waiting a long time for a game' : 'Waiting for the next game'}
      aria-label={`waiting ${formatElapsed(waited)}`}
    >
      <Hourglass aria-hidden />
      {formatElapsed(waited)}
    </span>
  )
}
