import type { PlayerView } from '@matchpoynt/shared'
import { Trash2, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Sport } from '@/interfaces/Sport'

interface AwaitingCheckInListProps {
  sport: Sport
  /** By name, as the server returns them. */
  players: PlayerView[]
  onCheckIn: (playerId: string) => void
  onRemove: (playerId: string) => void
}

/** Roster players who haven't arrived. They can't be matched or dragged until they check in (QR or by hand). */
export default function AwaitingCheckInList({ sport, players, onCheckIn, onRemove }: AwaitingCheckInListProps) {
  const tierLabel = (tierId: string) => sport.tiers.find((t) => t.id === tierId)?.label ?? tierId
  return (
    <section aria-labelledby="awaiting-check-in" className="space-y-1 pt-4 pr-3">
      <h3 id="awaiting-check-in" className="queue-section-title">
        Not checked in · {players.length}
      </h3>
      <ul className="divide-y">
        {players.map((player) => (
          <li key={player.id} className="queue-player-row text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-medium" title={player.name}>
                {player.name}
              </span>
              <Button variant="outline" size="sm" onClick={() => onCheckIn(player.id)} aria-label={`Check ${player.name} in`}>
                <UserCheck />
                Check in
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onRemove(player.id)} aria-label={`Remove ${player.name} from the session`}>
                <Trash2 />
              </Button>
            </div>
            <Badge variant="outline">{tierLabel(player.tierId)}</Badge>
          </li>
        ))}
      </ul>
    </section>
  )
}
