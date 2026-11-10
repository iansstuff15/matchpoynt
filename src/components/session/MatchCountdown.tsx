import { AlarmClock, TimerOff } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Progress } from '@/components/ui/progress'
import { board } from '@/config/board'
import { cn } from '@/utils/cn'
import { notifyWarning } from '@/utils/feedback/notify'
import { formatElapsed } from '@/utils/time/formatElapsed'

interface MatchCountdownProps {
  courtLabel: string
  /** ISO times from the server: when the match started and when it reaches the limit. */
  startedAt: string
  endsAt: string
  now: number
}

/**
 * Time left before the session's match time limit, with a bar that fills as
 * it runs down. Warns near the end, then counts how far over the match is,
 * and toasts once when the court goes over.
 */
export default function MatchCountdown({ courtLabel, startedAt, endsAt, now }: MatchCountdownProps) {
  const start = Date.parse(startedAt)
  const end = Date.parse(endsAt)
  const left = end - now
  const over = left < 0
  const warning = !over && left <= board.timerWarningMs
  const used = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))

  // Toast the moment a court crosses its limit while the board is open (not on load).
  const wasOver = useRef(over)
  useEffect(() => {
    if (over && !wasOver.current) notifyWarning(`${courtLabel} is over time`, `The match passed its ${formatElapsed(end - start)} limit.`)
    wasOver.current = over
  }, [over, courtLabel, end, start])

  return (
    <div className="grid gap-1.5" role="timer" aria-live="off" aria-label={`${courtLabel} time limit`}>
      <div
        className={cn(
          'flex items-center justify-between text-xs font-medium tabular-nums',
          over ? 'text-destructive' : warning ? 'text-warning-foreground' : 'text-muted-foreground',
        )}
      >
        <span className="flex items-center gap-1.5">
          {over ? <TimerOff className="size-3.5" aria-hidden /> : <AlarmClock className="size-3.5" aria-hidden />}
          {over ? `Over by ${formatElapsed(-left)}` : `${formatElapsed(left)} left`}
        </span>
        <span>limit {formatElapsed(end - start)}</span>
      </div>
      <Progress
        value={used}
        aria-label={over ? 'Time limit passed' : `${Math.round(used)}% of the time limit used`}
        tone={over ? 'destructive' : warning ? 'warning' : 'default'}
        className="h-1.5"
      />
    </div>
  )
}
