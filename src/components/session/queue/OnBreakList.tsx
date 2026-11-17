import type { PlayerView } from '@matchpoynt/shared'
import { Coffee, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatElapsed } from '@/utils/time/formatElapsed'

interface OnBreakListProps {
  /** Longest first, as the server returns them. */
  players: PlayerView[]
  /** The queue panel's clock (API time), for how long they've been away. */
  now: number
  onBack: (playerId: string) => void
}

/** Checked-in players taking a break: they sit out the queue until they're back, from here or their phone. */
export default function OnBreakList({ players, now, onBack }: OnBreakListProps) {
  return (
    <section aria-labelledby="on-break" className="space-y-1 pt-4 pr-3">
      <h3 id="on-break" className="queue-section-title flex items-center gap-1.5">
        <Coffee className="size-3.5" aria-hidden />
        On a break · {players.length}
      </h3>
      <ul className="divide-y" aria-label="Players on a break">
        {players.map((player) => (
          <li key={player.id} className="queue-player-row text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-medium" title={player.name}>
                {player.name}
              </span>
              {player.breakSince && (
                <span className="text-xs tabular-nums" aria-label={`away ${formatElapsed(now - Date.parse(player.breakSince))}`}>
                  {formatElapsed(now - Date.parse(player.breakSince))}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => onBack(player.id)} aria-label={`Bring ${player.name} back to the queue`}>
                <Undo2 />
                Back
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
