import type { PlayerView } from '@matchpoynt/shared'
import { Coffee, GripVertical, Trash2 } from 'lucide-react'
import DraggablePlayer from '@/components/session/dnd/DraggablePlayer'
import WaitTime from '@/components/session/queue/WaitTime'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface QueueRowProps {
  player: PlayerView
  /** Place in the call order. */
  position: number
  tierLabel: string
  /** The queue panel's clock (API time), for the wait time. */
  now: number
  onRemove: (playerId: string) => void
  onBreak: (playerId: string) => void
}

/** One checked-in player waiting in the queue: name, wait time, games, a break and remove on one line, skill tier below. Drag the name onto a court side. */
export default function QueueRow({ player, position, tierLabel, now, onRemove, onBreak }: QueueRowProps) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="w-6 pt-1.5 text-right text-sm text-muted-foreground tabular-nums">{position}</span>
      <div className="queue-player-row min-w-0 flex-1 py-0">
        <div className="flex items-center gap-2">
          <DraggablePlayer player={{ playerId: player.id, name: player.name, from: 'queue' }} className="flex min-w-0 flex-1 items-center gap-2">
            <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate font-medium" title={player.name}>
              {player.name}
            </span>
          </DraggablePlayer>
          <WaitTime waitingSince={player.waitingSince} now={now} />
          <span className="text-xs whitespace-nowrap text-muted-foreground">{player.gamesPlayed} played</span>
          <Button variant="ghost" size="icon-sm" onClick={() => onBreak(player.id)} aria-label={`Give ${player.name} a break`} title="Take a break">
            <Coffee />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => onRemove(player.id)} aria-label={`Remove ${player.name} from the session`}>
            <Trash2 />
          </Button>
        </div>
        <Badge variant="secondary" className="ml-6">
          {tierLabel}
        </Badge>
      </div>
    </li>
  )
}
