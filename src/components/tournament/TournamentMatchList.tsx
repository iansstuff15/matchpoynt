import type { TournamentMatchView } from '@matchpoynt/shared'
import { LoaderCircle, Play, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TournamentMatchListProps {
  title: string
  matches: TournamentMatchView[]
  /** Owner view: start a ready match on the first free tournament court. Left out on the public page. */
  onStart?: (match: TournamentMatchView) => void
  startingId?: string | null
}

const sides = (m: TournamentMatchView) => `${m.sides[0].label} vs ${m.sides[1].label}`

/** "On court now" and "Up next": tournament matches as rows, with a start button for the Queue Master. */
export default function TournamentMatchList({ title, matches, onStart, startingId }: TournamentMatchListProps) {
  return (
    <section aria-label={title} className="grid gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="grid gap-2">
        {matches.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {m.label}
                {m.status === 'playing' && m.courtLabel && (
                  <span className="ml-2 inline-flex items-center gap-1 font-medium text-foreground">
                    <Radio className="size-3" aria-hidden />
                    {m.courtLabel}
                  </span>
                )}
              </p>
              <p className="truncate text-sm font-medium" title={sides(m)}>
                {sides(m)}
              </p>
              {onStart && m.startBlockedReason && <p className="text-xs text-muted-foreground">{m.startBlockedReason}</p>}
            </div>
            {onStart && m.status === 'ready' && (
              <Button size="sm" variant="secondary" disabled={!m.canStart || startingId === m.id} onClick={() => onStart(m)}>
                {startingId === m.id ? <LoaderCircle className="animate-spin" /> : <Play />}
                Start
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
